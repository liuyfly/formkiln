/**
 * The visual condition model: rules ("field operator value") combined with all/any. Conditions
 * the model cannot express are kept as JSON Logic and edited as JSON.
 *
 * Serialization follows Formkiln semantics (operators-v1): strict equality, no truthiness,
 * `in` for substrings and array membership, `date.diff` for date comparisons.
 */
import type { Element, FormDocument, Option, Text } from "@formkiln/spec";
import { childrenOf, elementAt, type Loc } from "./tree";

export type Operator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "anyOf"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "before"
  | "after"
  | "isTrue"
  | "isNotTrue"
  | "empty"
  | "notEmpty";

export interface Rule {
  /** A `var` path: a field key, or `$item.<child>` inside a repeater. */
  field: string;
  op: Operator;
  /** The compared value; for `before`/`after` a `YYYY-MM-DD` date or `"today"`. */
  value?: unknown;
}

export interface Group {
  combinator: "and" | "or";
  rules: Rule[];
}

/** What the editor can reference. */
export interface FieldRef {
  path: string;
  label: string;
  type: string;
  options?: Option[];
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "is",
  notEquals: "is not",
  contains: "contains",
  notContains: "does not contain",
  anyOf: "is one of",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  before: "is before",
  after: "is after",
  isTrue: "is yes",
  isNotTrue: "is not yes",
  empty: "is empty",
  notEmpty: "is not empty",
};

/** Operators offered for a field type, in menu order. */
export function operatorsFor(type: string): Operator[] {
  switch (type) {
    case "text":
    case "textarea":
    case "email":
    case "phone":
    case "url":
      return ["equals", "notEquals", "contains", "notContains", "empty", "notEmpty"];
    case "number":
      return ["equals", "notEquals", "gt", "gte", "lt", "lte", "empty", "notEmpty"];
    case "radio":
    case "select":
      return ["equals", "notEquals", "anyOf", "empty", "notEmpty"];
    case "checkboxes":
      return ["contains", "notContains", "empty", "notEmpty"];
    case "boolean":
      return ["isTrue", "isNotTrue"];
    case "date":
      return ["before", "after", "equals", "notEquals", "empty", "notEmpty"];
    case "time":
    case "datetime":
      return ["equals", "notEquals", "empty", "notEmpty"];
    default:
      return ["empty", "notEmpty"];
  }
}

export const NO_VALUE: Operator[] = ["isTrue", "isNotTrue", "empty", "notEmpty"];

/** A sensible starting value for a rule. */
export function defaultValue(ref: FieldRef | undefined, op: Operator): unknown {
  if (NO_VALUE.includes(op)) return undefined;
  if (op === "before" || op === "after") return "today";
  if (op === "anyOf") return ref?.options?.[0] ? [ref.options[0].value] : [];
  if (ref?.options?.length) return ref.options[0]!.value;
  if (ref?.type === "number") return 0;
  return "";
}

// ---------------------------------------------------------------- serialization

const v = (path: string) => ({ var: path });
const dateArg = (value: unknown) => (value === "today" ? { "date.today": [] } : value);

export function ruleToLogic(rule: Rule): unknown {
  const x = v(rule.field);
  switch (rule.op) {
    case "equals":
      return { "==": [x, rule.value] };
    case "notEquals":
      return { "!=": [x, rule.value] };
    case "contains":
      return { in: [rule.value, x] };
    case "notContains":
      return { "!": [{ in: [rule.value, x] }] };
    case "anyOf":
      return { in: [x, rule.value] };
    case "lt":
      return { "<": [x, rule.value] };
    case "lte":
      return { "<=": [x, rule.value] };
    case "gt":
      return { ">": [x, rule.value] };
    case "gte":
      return { ">=": [x, rule.value] };
    case "before":
      return { ">": [{ "date.diff": [x, dateArg(rule.value), "day"] }, 0] };
    case "after":
      return { "<": [{ "date.diff": [x, dateArg(rule.value), "day"] }, 0] };
    case "isTrue":
      return { "==": [x, true] };
    case "isNotTrue":
      return { "!=": [x, true] };
    case "empty":
      return { empty: [x] };
    case "notEmpty":
      return { "!": [{ empty: [x] }] };
  }
}

export function groupToLogic(group: Group): unknown {
  if (group.rules.length === 0) return undefined;
  if (group.rules.length === 1) return ruleToLogic(group.rules[0]!);
  return { [group.combinator]: group.rules.map(ruleToLogic) };
}

// ---------------------------------------------------------------- parsing

type Json = unknown;

function single(node: Json): [string, Json[]] | null {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  const keys = Object.keys(node);
  if (keys.length !== 1) return null;
  const op = keys[0]!;
  const raw = (node as Record<string, Json>)[op];
  return [op, Array.isArray(raw) ? raw : [raw]];
}

function varPath(node: Json): string | null {
  const parsed = single(node);
  if (!parsed || parsed[0] !== "var" || parsed[1].length !== 1 || typeof parsed[1][0] !== "string")
    return null;
  return parsed[1][0];
}

const isLiteral = (value: Json) =>
  value === null ||
  ["string", "number", "boolean"].includes(typeof value) ||
  (Array.isArray(value) && value.every((x) => x === null || typeof x !== "object"));

function isDateArg(value: Json): boolean {
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = single(value);
  return !!parsed && parsed[0] === "date.today" && parsed[1].length === 0;
}

/** One rule, or null when the expression is not a rule the editor understands. */
export function parseRule(node: Json): Rule | null {
  const parsed = single(node);
  if (!parsed) return null;
  const [op, args] = parsed;
  if ((op === "==" || op === "!=") && args.length === 2) {
    const field = varPath(args[0]);
    if (!field || !isLiteral(args[1]) || Array.isArray(args[1])) return null;
    if (args[1] === true) return { field, op: op === "==" ? "isTrue" : "isNotTrue" };
    return { field, op: op === "==" ? "equals" : "notEquals", value: args[1] };
  }
  if (["<", "<=", ">", ">="].includes(op) && args.length === 2) {
    const field = varPath(args[0]);
    if (field && typeof args[1] === "number") {
      return {
        field,
        op: ({ "<": "lt", "<=": "lte", ">": "gt", ">=": "gte" } as const)[op as "<"],
        value: args[1],
      };
    }
    // Date comparison: date.diff(field, date, "day") > 0 (before) or < 0 (after).
    const diff = single(args[0]);
    if (
      (op === ">" || op === "<") &&
      args[1] === 0 &&
      diff &&
      diff[0] === "date.diff" &&
      diff[1].length === 3 &&
      diff[1][2] === "day"
    ) {
      const dateField = varPath(diff[1][0]);
      if (!dateField || !isDateArg(diff[1][1])) return null;
      const value = typeof diff[1][1] === "string" ? diff[1][1] : "today";
      return { field: dateField, op: op === ">" ? "before" : "after", value };
    }
    return null;
  }
  if (op === "in" && args.length === 2) {
    const haystack = varPath(args[1]);
    if (haystack && isLiteral(args[0]) && !Array.isArray(args[0]))
      return { field: haystack, op: "contains", value: args[0] };
    const needle = varPath(args[0]);
    if (needle && Array.isArray(args[1]) && isLiteral(args[1]))
      return { field: needle, op: "anyOf", value: args[1] };
    return null;
  }
  if (op === "empty" && args.length === 1) {
    const field = varPath(args[0]);
    return field ? { field, op: "empty" } : null;
  }
  if (op === "!" && args.length === 1) {
    const inner = parseRule(args[0]);
    if (inner?.op === "empty") return { field: inner.field, op: "notEmpty" };
    if (inner?.op === "contains") return { ...inner, op: "notContains" };
    return null;
  }
  return null;
}

/** A group of rules, or null when the condition needs the JSON editor. */
export function parseGroup(node: Json): Group | null {
  const parsed = single(node);
  if (parsed && (parsed[0] === "and" || parsed[0] === "or") && parsed[1].length > 0) {
    const rules = parsed[1].map(parseRule);
    return rules.every((rule): rule is Rule => rule !== null)
      ? { combinator: parsed[0], rules }
      : null;
  }
  const rule = parseRule(node);
  return rule ? { combinator: "and", rules: [rule] } : null;
}

// ---------------------------------------------------------------- referenceable fields

function textOf(value: Text | undefined, locale: string): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : (value[locale] ?? Object.values(value)[0] ?? "");
}

const NOT_VALUES = new Set(["content", "panel"]);

function collect(
  elements: Element[],
  prefix: string,
  locale: string,
  out: FieldRef[],
  skip: Element | undefined,
  intoRepeaters: boolean,
) {
  for (const element of elements) {
    const any = element as unknown as Record<string, unknown>;
    if (element !== skip && !NOT_VALUES.has(element.type)) {
      out.push({
        path: prefix + element.key,
        label: textOf((any.label ?? any.title) as Text | undefined, locale) || element.key,
        type:
          element.type === "hidden"
            ? String(any.valueType ?? "string") === "string"
              ? "text"
              : String(any.valueType)
            : element.type,
        ...(Array.isArray(any.options) && { options: any.options as Option[] }),
      });
    }
    const children = childrenOf(element);
    if (children && (element.type !== "repeater" || intoRepeaters))
      collect(children, prefix, locale, out, skip, intoRepeaters);
  }
}

/**
 * Fields a condition at `loc` can reference: fields outside repeaters (by key) and, inside a
 * repeater, the fields of the same item (`$item.<key>`). `loc` null means the form level.
 */
export function referenceableFields(doc: FormDocument, loc: Loc | null): FieldRef[] {
  const locale = doc.settings?.defaultLocale ?? "en";
  const self = loc && loc.path.length ? elementAt(doc, loc) : undefined;
  const refs: FieldRef[] = [];
  if (loc && loc.path.length) {
    for (let depth = loc.path.length - 1; depth >= 1; depth--) {
      const ancestor = elementAt(doc, { page: loc.page, path: loc.path.slice(0, depth) });
      if (ancestor?.type === "repeater") {
        collect(childrenOf(ancestor) ?? [], "$item.", locale, refs, self, false);
        break;
      }
    }
  }
  for (const page of doc.pages) collect(page.elements, "", locale, refs, self, false);
  return refs;
}
