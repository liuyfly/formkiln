import type {
  DefinitionError,
  Expression,
  Field,
  FormDocument,
  JsonValue,
  Validator,
} from "@formkiln/spec";
import { compilePortableRegex } from "../expression/regex";
import { isPlainObject } from "../expression/values";
import { buildModel, partsOf, requiredPartsOf, type FormModel, type FormNode } from "./model";
import { hasValueType, normalizeValue } from "./values";

/** Allowed argument counts per operator (operators-v1 §10). */
const ARITY: Readonly<Record<string, readonly [number, number]>> = {
  "date.today": [0, 0],
  cat: [0, Infinity],
  "!": [1, 1],
  empty: [1, 1],
  length: [1, 1],
  lower: [1, 1],
  upper: [1, 1],
  sum: [1, 1],
  var: [1, 2],
  "-": [1, 2],
  round: [1, 2],
  and: [1, Infinity],
  or: [1, Infinity],
  if: [1, Infinity],
  "+": [1, Infinity],
  "*": [1, Infinity],
  min: [1, Infinity],
  max: [1, Infinity],
  "==": [2, 2],
  "!=": [2, 2],
  ">": [2, 2],
  ">=": [2, 2],
  "/": [2, 2],
  "%": [2, 2],
  matches: [2, 2],
  in: [2, 2],
  some: [2, 2],
  all: [2, 2],
  none: [2, 2],
  map: [2, 2],
  filter: [2, 2],
  "<": [2, 3],
  "<=": [2, 3],
  "date.add": [3, 3],
  "date.diff": [3, 3],
};

const ARRAY_OPERATORS = new Set(["some", "all", "none", "map", "filter"]);

/** Value types each validator applies to (Form Schema §9); null means any. */
const VALIDATOR_TYPES: Readonly<Record<Validator["type"], readonly string[] | null>> = {
  minLength: ["string"],
  maxLength: ["string"],
  pattern: ["string"],
  min: ["number"],
  max: ["number"],
  integer: ["number"],
  minDate: ["date"],
  maxDate: ["date"],
  minItems: ["string[]", "file[]"],
  maxItems: ["string[]", "file[]"],
  maxFileSize: ["file[]"],
  fileTypes: ["file[]"],
  equals: null,
  expression: null,
};

export function escapePointer(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Splits an operation into operator, arguments and a pointer builder for each argument. */
export function operationParts(
  expression: Expression,
  pointer: string,
): { operator: string; args: Expression[]; argPointer: (index: number) => string } | null {
  if (!isPlainObject(expression)) return null;
  const keys = Object.keys(expression);
  if (keys.length !== 1) return null;
  const operator = keys[0]!;
  const raw = (expression as Record<string, Expression>)[operator]!;
  const base = `${pointer}/${escapePointer(operator)}`;
  return Array.isArray(raw)
    ? { operator, args: raw, argPointer: (i) => `${base}/${i}` }
    : { operator, args: [raw], argPointer: () => base };
}

/** Every literal `var` path in an expression. */
export function varPaths(expression: Expression | undefined): string[] {
  const paths: string[] = [];
  const walk = (expr: Expression | undefined): void => {
    if (Array.isArray(expr)) {
      expr.forEach(walk);
      return;
    }
    const op = operationParts(expr ?? null, "");
    if (!op) return;
    if (op.operator === "var" && typeof op.args[0] === "string") paths.push(op.args[0]);
    op.args.forEach(walk);
  };
  walk(expression);
  return paths;
}

interface Scope {
  repeater: FormNode | null;
  allowValue: boolean;
  arrayDepth: number;
}

/**
 * Validates the semantic rules of a structurally valid form document (Form Schema §10).
 * Returns every problem found; an empty list means the document is valid.
 */
export function validateDefinition(doc: FormDocument): DefinitionError[] {
  const model = buildModel(doc);
  const errors: DefinitionError[] = [];
  const report = (pointer: string, code: DefinitionError["code"]) => errors.push({ pointer, code });

  checkKeys(model, report);
  checkOutcomeKeys(doc, report);
  checkWidths(model, report);

  const checkExpression = (expression: Expression, pointer: string, scope: Scope): void => {
    if (Array.isArray(expression)) {
      expression.forEach((item, i) => checkExpression(item, `${pointer}/${i}`, scope));
      return;
    }
    const op = operationParts(expression, pointer);
    if (!op) return;
    const [min, max] = ARITY[op.operator] ?? [0, Infinity];
    if (op.args.length < min || op.args.length > max) report(pointer, "arity");

    if (op.operator === "var") {
      const path = op.args[0];
      if (typeof path !== "string") report(pointer, "varPath");
      else if (!isKnownReference(path, model, scope)) report(pointer, "unknownReference");
    }
    if (op.operator === "matches" && typeof op.args[1] === "string") {
      if (!compilePortableRegex(op.args[1]).ok) report(op.argPointer(1), "invalidPattern");
    }
    op.args.forEach((arg, i) => {
      const inner =
        ARRAY_OPERATORS.has(op.operator) && i === 1
          ? { ...scope, arrayDepth: scope.arrayDepth + 1 }
          : scope;
      if (op.operator === "var" && i === 0) return;
      checkExpression(arg, op.argPointer(i), inner);
    });
  };

  for (const node of model.nodes) {
    const scope: Scope = { repeater: node.repeater, allowValue: false, arrayDepth: 0 };
    const source = node.source as unknown as Record<string, Expression>;
    for (const property of ["visible", "required", "readOnly", "calculate"]) {
      if (source[property] !== undefined) {
        checkExpression(source[property]!, `${node.pointer}/${property}`, scope);
      }
    }
    if (node.kind === "field") checkField(node, scope, report, checkExpression);
  }

  doc.submit?.outcomes?.forEach((outcome, i) => {
    if (outcome.when !== undefined) {
      checkExpression(outcome.when, `/submit/outcomes/${i}/when`, {
        repeater: null,
        allowValue: false,
        arrayDepth: 0,
      });
    }
  });

  checkCycles(model, report);
  return errors;
}

function isKnownReference(path: string, model: FormModel, scope: Scope): boolean {
  const head = path.split(".")[0]!;
  switch (head) {
    case "$item":
    case "$index":
      return scope.repeater !== null;
    case "$value":
      return scope.allowValue;
    case "$this":
    case "$thisIndex":
      return scope.arrayDepth > 0;
    default:
      return model.topValues.has(head);
  }
}

type Report = (pointer: string, code: DefinitionError["code"]) => void;

/** Form Schema §5.5: an element spans at most the columns of the layout grid. */
function checkWidths(model: FormModel, report: Report): void {
  const columns = model.doc.settings?.layout?.columns ?? 3;
  for (const node of model.nodes) {
    if (node.kind === "page") continue;
    const width = (node.source as { width?: number }).width;
    if (width !== undefined && width > columns) report(`${node.pointer}/width`, "width");
  }
}

function checkKeys(model: FormModel, report: Report): void {
  const seen = new Map<FormNode | null, Set<string>>();
  for (const node of model.nodes) {
    // Repeater children share the repeater's namespace; everything else shares the top one.
    const namespace = node.repeater;
    const keys = seen.get(namespace) ?? new Set<string>();
    seen.set(namespace, keys);
    if (keys.has(node.key)) report(`${node.pointer}/key`, "duplicateKey");
    keys.add(node.key);
  }
}

function checkOutcomeKeys(doc: FormDocument, report: Report): void {
  const keys = new Set<string>();
  doc.submit?.outcomes?.forEach((outcome, i) => {
    if (keys.has(outcome.key)) report(`/submit/outcomes/${i}/key`, "duplicateOutcomeKey");
    keys.add(outcome.key);
  });
}

function checkField(
  node: FormNode,
  scope: Scope,
  report: Report,
  checkExpression: (expression: Expression, pointer: string, scope: Scope) => void,
): void {
  const field = node.source as Field;
  const valueType = node.valueType!;
  const matchesType = (value: JsonValue) => {
    const normalized = normalizeValue(valueType, value);
    return normalized === null || hasValueType(valueType, normalized, field);
  };

  if ("options" in field) {
    const values = new Set<string>();
    field.options.forEach((option, i) => {
      if (values.has(option.value)) report(`${node.pointer}/options/${i}/value`, "duplicateOption");
      values.add(option.value);
    });
  }
  if (field.type === "name" || field.type === "address") {
    const parts = partsOf(field);
    if (!requiredPartsOf(field).every((part) => parts.includes(part))) {
      report(`${node.pointer}/requiredParts`, "requiredParts");
    }
  }
  if (field.defaultValue !== undefined && !matchesType(field.defaultValue)) {
    report(`${node.pointer}/defaultValue`, "valueType");
  }

  field.validators?.forEach((validator, i) => {
    const pointer = `${node.pointer}/validators/${i}`;
    const allowed = VALIDATOR_TYPES[validator.type];
    if (allowed && !allowed.includes(valueType)) report(pointer, "validatorType");
    switch (validator.type) {
      case "equals":
        if (!matchesType(validator.value)) report(`${pointer}/value`, "valueType");
        break;
      case "pattern":
        if (!compilePortableRegex(validator.value).ok) report(`${pointer}/value`, "invalidPattern");
        break;
      case "minDate":
      case "maxDate":
        if (typeof validator.value !== "string")
          checkExpression(validator.value, `${pointer}/value`, scope);
        break;
      case "expression":
        checkExpression(validator.rule, `${pointer}/rule`, { ...scope, allowValue: true });
        break;
    }
  });
}

/**
 * Reports one `cycle` error per strongly connected component of the dependency
 * graph (Form Schema §7.5) that contains a cycle.
 */
function checkCycles(model: FormModel, report: Report): void {
  // Value nodes: fields and repeaters. Repeater children are identified per repeater.
  const valueNodes = model.nodes.filter((n) => n.kind === "field" || n.kind === "repeater");
  const order = new Map(valueNodes.map((n, i) => [n, i] as const));

  const resolve = (path: string, from: FormNode): FormNode[] => {
    const [head, child] = path.split(".");
    if (head === "$item" && from.repeater) {
      const fields = model.repeaterFields.get(from.repeater.key)!;
      if (child === undefined) return [...fields.values()];
      const target = fields.get(child);
      return target ? [target] : [];
    }
    const target = model.topValues.get(head!);
    return target ? [target] : [];
  };

  const edges = new Map<FormNode, Set<FormNode>>();
  for (const node of valueNodes) {
    const targets = new Set<FormNode>();
    const add = (expression: Expression | undefined, from: FormNode) => {
      for (const path of varPaths(expression)) resolve(path, from).forEach((t) => targets.add(t));
    };
    add((node.source as Field).calculate, node);
    for (let n: FormNode | null = node; n; n = n.parent) {
      add((n.source as { visible?: Expression }).visible, n);
    }
    if (node.kind === "repeater") {
      model.repeaterFields.get(node.key)?.forEach((child) => targets.add(child));
    }
    edges.set(node, targets);
  }

  // Tarjan's strongly connected components.
  let index = 0;
  const indices = new Map<FormNode, number>();
  const lowLinks = new Map<FormNode, number>();
  const stack: FormNode[] = [];
  const onStack = new Set<FormNode>();

  const connect = (node: FormNode): void => {
    indices.set(node, index);
    lowLinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);
    for (const target of edges.get(node) ?? []) {
      if (!indices.has(target)) {
        connect(target);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(target)!));
      }
    }
    if (lowLinks.get(node) === indices.get(node)) {
      const component: FormNode[] = [];
      let member: FormNode;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      const cyclic = component.length > 1 || edges.get(node)!.has(node);
      if (cyclic) {
        const first = component.reduce((a, b) => (order.get(a)! <= order.get(b)! ? a : b));
        report(first.pointer, "cycle");
      }
    }
  };
  valueNodes.forEach((node) => {
    if (!indices.has(node)) connect(node);
  });
}
