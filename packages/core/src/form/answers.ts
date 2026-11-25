import type {
  Expression,
  Field,
  FormDocument,
  JsonValue,
  Text,
  ValidationError,
  ValidationResult,
} from "@formkiln/spec";
import { evaluate, type Scope } from "../expression/evaluate";
import { compilePortableRegex } from "../expression/regex";
import { deepEqual, isPlainObject, type JsonObject } from "../expression/values";
import { varPaths } from "./definition";
import { buildModel, partsOf, repeaterChildFields, requiredPartsOf, type FormNode } from "./model";
import { hasValueType, normalizeValue } from "./values";

export interface ValidateAnswersOptions {
  /** Evaluation instant for `date.today`. Defaults to the current time. */
  now?: Date | string;
  /** Locale for custom messages. Defaults to the form's `defaultLocale`. */
  locale?: string;
}

export interface FormEvaluation extends ValidationResult {
  /** Paths of all inactive elements. */
  inactive: string[];
}

const FORMATS: Readonly<Record<string, readonly [string, string]>> = {
  email: ["format.email", "[^\\s@]+@[^\\s@]+\\.[^\\s@]+"],
  phone: ["format.phone", "\\+?[0-9 ()\\-]{6,20}"],
  url: ["format.url", "https?://[^\\s/?#]+(?:[/?#]\\S*)?"],
};

interface Slot {
  value: JsonValue;
  typeError: boolean;
}

function checked(node: FormNode, raw: JsonValue | undefined): Slot {
  const valueType = node.valueType!;
  const value = normalizeValue(valueType, raw);
  if (value === null) return { value: null, typeError: false };
  const ok = hasValueType(
    valueType,
    value,
    node.kind === "field" ? (node.source as Field) : undefined,
  );
  return ok ? { value, typeError: false } : { value: null, typeError: true };
}

/**
 * Validates answers against a valid form document (Form Schema §11): normalises and
 * type-checks them, computes visibility and calculated values, validates every
 * active field, selects the outcome and builds the submission.
 */
export function validateAnswers(
  doc: FormDocument,
  answers: Readonly<Record<string, JsonValue>>,
  options: ValidateAnswersOptions = {},
): FormEvaluation {
  const model = buildModel(doc);
  const timeZone = doc.settings?.timeZone ?? "UTC";
  const defaultLocale = doc.settings?.defaultLocale ?? "en";
  const locale = options.locale ?? defaultLocale;
  const now = options.now === undefined ? new Date() : new Date(options.now);

  // 1. Normalise and type-check stored answers.
  const topSlots = new Map<string, Slot>();
  const itemSlots = new Map<string, Map<string, Slot>[]>();
  for (const [key, node] of model.topValues) {
    if ((node.source as Field).calculate !== undefined) continue;
    const slot = checked(node, answers[key]);
    topSlots.set(key, slot);
    if (node.kind === "repeater") {
      const children = model.repeaterFields.get(key)!;
      const items = Array.isArray(slot.value) ? (slot.value as JsonObject[]) : [];
      itemSlots.set(
        key,
        items.map((item) => {
          const slots = new Map<string, Slot>();
          for (const [childKey, child] of children) {
            if ((child.source as Field).calculate === undefined) {
              slots.set(childKey, checked(child, item[childKey]));
            }
          }
          return slots;
        }),
      );
    }
  }

  // 2. Lazily computed activity, calculated values and effective values.
  const activeMemo = new Map<string, boolean>();
  const effectiveMemo = new Map<string, JsonValue>();
  const calcMemo = new Map<string, Slot>();
  // In-progress ids per memo: activity, calculation and effective value of the same path are
  // different computations. Sharing one set made the effective value of a field look like a
  // cycle when its activity was needed (a rule referencing a later field).
  const inProgress = new Map<Map<string, unknown>, Set<string>>();

  const pathOf = (node: FormNode, index: number | null) =>
    node.repeater && index !== null ? `${node.repeater.key}.${index}.${node.key}` : node.key;

  const memoized = <T>(memo: Map<string, T>, id: string, fallback: T, compute: () => T): T => {
    if (memo.has(id)) return memo.get(id)!;
    let running = inProgress.get(memo as Map<string, unknown>);
    if (!running) inProgress.set(memo as Map<string, unknown>, (running = new Set()));
    if (running.has(id)) return fallback; // Only reachable for invalid (cyclic) documents.
    running.add(id);
    const value = compute();
    running.delete(id);
    memo.set(id, value);
    return value;
  };

  const evalIn = (
    expression: Expression,
    node: FormNode,
    index: number | null,
    extra: Scope = {},
  ): JsonValue => {
    const data: JsonObject = {};
    const scope: Scope = { ...extra };
    const repeater = node.repeater;
    for (const path of varPaths(expression)) {
      const [head, child] = path.split(".");
      if (head === "$item" && repeater && index !== null) {
        const item = (scope.$item as JsonObject | undefined) ?? {};
        const keys =
          child === undefined ? [...model.repeaterFields.get(repeater.key)!.keys()] : [child];
        for (const key of keys) {
          if (model.repeaterFields.get(repeater.key)!.has(key)) {
            item[key] = childEffective(repeater, index, key);
          }
        }
        scope.$item = item;
      } else if (head === "$index" && index !== null) {
        scope.$index = index;
      } else if (head && model.topValues.has(head)) {
        data[head] = topEffective(head);
      }
    }
    return evaluate(expression, { data, scope, now, timeZone });
  };

  const holds = (
    condition: Expression | undefined,
    node: FormNode,
    index: number | null,
    fallback: boolean,
  ) => (condition === undefined ? fallback : evalIn(condition, node, index) === true);

  const isActive = (node: FormNode, index: number | null): boolean =>
    memoized(activeMemo, pathOf(node, index), false, () => {
      const parent = node.parent;
      const parentIndex = parent && parent.repeater ? index : null;
      if (parent && !isActive(parent, parentIndex)) return false;
      return holds((node.source as { visible?: Expression }).visible, node, index, true);
    });

  const calculated = (node: FormNode, index: number | null): Slot =>
    memoized(calcMemo, pathOf(node, index), { value: null, typeError: false }, () =>
      checked(node, evalIn((node.source as Field).calculate!, node, index)),
    );

  const slotOf = (node: FormNode, index: number | null): Slot => {
    if ((node.source as Field).calculate !== undefined) return calculated(node, index);
    if (node.repeater && index !== null) {
      return itemSlots.get(node.repeater.key)![index]!.get(node.key)!;
    }
    return topSlots.get(node.key)!;
  };

  function childEffective(repeater: FormNode, index: number, key: string): JsonValue {
    const node = model.repeaterFields.get(repeater.key)!.get(key)!;
    return memoized(effectiveMemo, pathOf(node, index), null, () =>
      isActive(node, index) ? slotOf(node, index).value : null,
    );
  }

  function topEffective(key: string): JsonValue {
    const node = model.topValues.get(key)!;
    return memoized(effectiveMemo, key, null, () => {
      if (!isActive(node, null)) return null;
      if (node.kind === "field") return slotOf(node, null).value;
      const items = itemSlots.get(key)!;
      if (topSlots.get(key)!.value === null) return null;
      return items.map((_, i) => {
        const item: JsonObject = {};
        for (const childKey of model.repeaterFields.get(key)!.keys()) {
          item[childKey] = childEffective(node, i, childKey);
        }
        return item;
      });
    });
  }

  // 3. Validate active fields and repeaters in document order.
  const resolveText = (text: Text | undefined): string | undefined => {
    if (text === undefined) return undefined;
    if (typeof text === "string") return text;
    return text[locale] ?? text[defaultLocale] ?? Object.values(text)[0];
  };
  const errors: ValidationError[] = [];
  const report = (
    path: string,
    code: ValidationError["code"],
    message?: Text,
    params?: Record<string, JsonValue>,
  ) => {
    const resolved = resolveText(message);
    errors.push({
      path,
      code,
      ...(resolved !== undefined && { message: resolved }),
      ...(params && { params }),
    });
  };

  const validateField = (node: FormNode, index: number | null): void => {
    const field = node.source as Field;
    const path = pathOf(node, index);
    const slot = slotOf(node, index);
    if (slot.typeError) {
      report(path, "type");
      return;
    }
    const value = slot.value;
    if (value === null) {
      if (holds(field.required, node, index, false))
        report(path, "required", field.requiredMessage);
      return;
    }

    if (field.type === "name" || field.type === "address") {
      const required = requiredPartsOf(field);
      for (const part of partsOf(field)) {
        if (required.includes(part) && !Object.hasOwn(value as JsonObject, part)) {
          report(`${path}.${part}`, "required");
        }
      }
    }
    if ("options" in field) {
      const allowed = new Set(field.options.map((option) => option.value));
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => !allowed.has(item as string))) report(path, "option");
    }
    const format = FORMATS[field.type];
    if (format) {
      const regex = compilePortableRegex(format[1]);
      if (regex.ok && !regex.regex.test(value as string))
        report(path, format[0] as ValidationError["code"]);
    }
    if (field.type === "file" && !field.multiple && (value as JsonValue[]).length > 1) {
      report(path, "maxItems", undefined, { value: 1 });
    }

    for (const validator of field.validators ?? []) {
      const fail = (params?: Record<string, JsonValue>, at = path) =>
        report(
          at,
          validator.type === "fileTypes" ? "fileType" : validator.type,
          validator.message,
          params,
        );
      switch (validator.type) {
        case "minLength":
        case "maxLength": {
          if (typeof value !== "string") break;
          const length = [...value].length;
          if (
            validator.type === "minLength" ? length < validator.value : length > validator.value
          ) {
            fail({ value: validator.value });
          }
          break;
        }
        case "pattern": {
          const regex = compilePortableRegex(validator.value);
          if (typeof value === "string" && regex.ok && !regex.regex.test(value))
            fail({ value: validator.value });
          break;
        }
        case "min":
        case "max":
          if (
            typeof value === "number" &&
            (validator.type === "min" ? value < validator.value : value > validator.value)
          ) {
            fail({ value: validator.value });
          }
          break;
        case "integer":
          if (typeof value === "number" && !Number.isInteger(value)) fail();
          break;
        case "minDate":
        case "maxDate": {
          const limit =
            typeof validator.value === "string"
              ? validator.value
              : evalIn(validator.value, node, index);
          if (typeof value !== "string" || !hasValueType("date", limit)) break;
          if (
            validator.type === "minDate" ? value < (limit as string) : value > (limit as string)
          ) {
            fail({ value: limit });
          }
          break;
        }
        case "minItems":
        case "maxItems":
          if (Array.isArray(value)) {
            const count = value.length;
            if (validator.type === "minItems" ? count < validator.value : count > validator.value) {
              fail({ value: validator.value });
            }
          }
          break;
        case "maxFileSize":
          if (Array.isArray(value)) {
            value.forEach((file, i) => {
              if (isPlainObject(file) && (file.size as number) > validator.value) {
                fail({ value: validator.value }, `${path}.${i}`);
              }
            });
          }
          break;
        case "fileTypes":
          if (Array.isArray(value)) {
            value.forEach((file, i) => {
              if (
                isPlainObject(file) &&
                !validator.value.some((entry) => matchesFileType(file, entry))
              ) {
                fail({ value: validator.value }, `${path}.${i}`);
              }
            });
          }
          break;
        case "equals":
          if (!deepEqual(value, validator.value)) fail({ value: validator.value });
          break;
        case "expression":
          if (evalIn(validator.rule, node, index, { $value: value }) !== true) fail();
          break;
      }
    }
  };

  for (const node of model.nodes) {
    if (node.repeater) continue;
    if (node.kind === "field" && isActive(node, null)) validateField(node, null);
    if (node.kind === "repeater" && isActive(node, null)) {
      const slot = topSlots.get(node.key)!;
      if (slot.typeError) {
        report(node.key, "type");
        continue;
      }
      const repeater = node.source as { minItems?: number; maxItems?: number };
      const count = Array.isArray(slot.value) ? slot.value.length : 0;
      if (repeater.minItems !== undefined && count < repeater.minItems) {
        report(node.key, "minItems", undefined, { value: repeater.minItems });
      }
      if (repeater.maxItems !== undefined && count > repeater.maxItems) {
        report(node.key, "maxItems", undefined, { value: repeater.maxItems });
      }
      const children = repeaterChildFields(node);
      for (let i = 0; i < count; i++) {
        for (const child of children) {
          if (isActive(child, i)) validateField(child, i);
        }
      }
    }
  }

  // 4. Outcome.
  let outcome: string | null = null;
  if (errors.length === 0) {
    const anchor = model.nodes[0]!;
    const selected = doc.submit?.outcomes?.find((candidate) =>
      holds(candidate.when, anchor, null, true),
    );
    outcome = selected?.key ?? null;
  }

  // 5. Submission and inactive paths.
  const submission: JsonObject = {};
  const inactive: string[] = [];
  for (const node of model.nodes) {
    if (node.repeater) continue;
    if (!isActive(node, null)) inactive.push(node.key);
    if (node.kind === "field") {
      const value = topEffective(node.key);
      if (value !== null) submission[node.key] = value;
    }
    if (node.kind === "repeater") {
      const count = itemSlots.get(node.key)?.length ?? 0;
      const descendants = model.nodes.filter((n) => n.repeater === node);
      const items: JsonObject[] = [];
      for (let i = 0; i < count; i++) {
        const item: JsonObject = {};
        for (const child of descendants) {
          if (!isActive(child, i)) {
            inactive.push(pathOf(child, i));
          } else if (child.kind === "field") {
            const value = childEffective(node, i, child.key);
            if (value !== null) item[child.key] = value;
          }
        }
        items.push(item);
      }
      if (isActive(node, null) && topSlots.get(node.key)!.value !== null)
        submission[node.key] = items;
    }
  }

  return { valid: errors.length === 0, errors, outcome, submission, inactive };
}

function matchesFileType(file: JsonObject, entry: string): boolean {
  const name = String(file.name).toLowerCase();
  const contentType = String(file.contentType).toLowerCase();
  const wanted = entry.toLowerCase();
  if (wanted.startsWith(".")) return name.endsWith(wanted);
  if (wanted.endsWith("/*")) return contentType.startsWith(wanted.slice(0, -1));
  return contentType === wanted;
}
