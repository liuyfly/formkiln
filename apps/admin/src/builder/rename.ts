/**
 * Renaming element keys without breaking the rules that reference them, and deriving keys from
 * labels. Reference scoping follows Form Schema §10 (`unknownReference`): a path starts with a
 * key defined outside any repeater, `$item` inside a repeater, or `$this` inside the second
 * argument of an array operator.
 */
import type { Element, FormDocument } from "@formkiln/spec";
import { childrenOf, elementAt, usedKeys, type Loc } from "./tree";

type Json = unknown;

const ARRAY_OPERATORS = new Set(["some", "all", "none", "map", "filter"]);

function isOperation(node: Json): node is Record<string, Json> {
  return (
    typeof node === "object" &&
    node !== null &&
    !Array.isArray(node) &&
    Object.keys(node).length === 1
  );
}

function argsOf(value: Json): Json[] {
  return Array.isArray(value) ? value : [value];
}

/** The path of a `var` operation and a setter for it, or null. */
function varPath(node: Record<string, Json>): { path: string; set: (path: string) => void } | null {
  if (!("var" in node)) return null;
  const value = node.var;
  if (typeof value === "string") return { path: value, set: (path) => (node.var = path) };
  if (Array.isArray(value) && typeof value[0] === "string") {
    return { path: value[0], set: (path) => (value[0] = path) };
  }
  return null;
}

/**
 * Visits every `var` path in an expression tree. `arrayOver` is the path of the array operand of
 * the innermost enclosing array operator, for `$this` references.
 */
function walk(
  node: Json,
  visit: (path: string, set: (path: string) => void, arrayOver: string | null) => void,
  arrayOver: string | null = null,
): void {
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit, arrayOver));
    return;
  }
  if (!isOperation(node)) return;
  const variable = varPath(node);
  if (variable) {
    visit(variable.path, variable.set, arrayOver);
    return;
  }
  const [operator] = Object.keys(node) as [string];
  const args = argsOf(node[operator]);
  args.forEach((arg, index) => {
    if (ARRAY_OPERATORS.has(operator) && index === 1) {
      const source = isOperation(args[0]) ? varPath(args[0] as Record<string, Json>) : null;
      walk(arg, visit, source?.path ?? null);
    } else {
      walk(arg, visit, arrayOver);
    }
  });
}

/** Expressions held by an element (not its children). */
function expressionsOf(element: Element): Json[] {
  const any = element as unknown as Record<string, Json>;
  const found: Json[] = [];
  for (const property of ["visible", "required", "readOnly", "calculate"]) {
    if (any[property] !== undefined) found.push(any[property]);
  }
  for (const validator of (any.validators as Record<string, Json>[] | undefined) ?? []) {
    if (validator.rule !== undefined) found.push(validator.rule);
    if (validator.value !== undefined) found.push(validator.value);
  }
  return found;
}

function eachElement(elements: Element[], visit: (element: Element) => void): void {
  for (const element of elements) {
    visit(element);
    const children = childrenOf(element);
    if (children) eachElement(children, visit);
  }
}

/** Every expression of the document: elements of all pages and outcome conditions. */
function allExpressions(doc: FormDocument): Json[] {
  const found: Json[] = [];
  for (const page of doc.pages) {
    eachElement(page.elements, (element) => found.push(...expressionsOf(element)));
  }
  for (const outcome of doc.submit?.outcomes ?? []) {
    if (outcome.when !== undefined) found.push(outcome.when);
  }
  return found;
}

/** Replaces the first segment `from` of a dotted path, or of `prefix.from`. */
function renamedPath(path: string, prefix: string[], from: string, to: string): string | null {
  const segments = path.split(".");
  if (segments.length <= prefix.length) return null;
  if (!prefix.every((part, i) => part === "*" || segments[i] === part)) return null;
  if (segments[prefix.length] !== from) return null;
  segments[prefix.length] = to;
  return segments.join(".");
}

/** The repeater enclosing `loc`, if any (keys inside it are scoped to its items). */
function enclosingRepeater(doc: FormDocument, loc: Loc): Element | null {
  for (let depth = loc.path.length - 1; depth >= 1; depth--) {
    const ancestor = elementAt(doc, { page: loc.page, path: loc.path.slice(0, depth) });
    if (ancestor?.type === "repeater") return ancestor;
  }
  return null;
}

/**
 * Renames the element at `loc` to `to` and rewrites every reference to it, so that rules keep
 * pointing at the same field. Mutates `doc` (an immer draft). The caller checks that `to` is a
 * valid, unused key.
 */
export function renameElement(doc: FormDocument, loc: Loc, to: string): void {
  const element = elementAt(doc, loc);
  if (!element || element.key === to) return;
  const from = element.key;
  const repeater = enclosingRepeater(doc, loc);
  element.key = to;

  if (!repeater) {
    // A top-level value (panels do not namespace): `from`, `from.part`, `from.0.child`.
    for (const expression of allExpressions(doc)) {
      walk(expression, (path, set) => {
        const renamed = renamedPath(path, [], from, to);
        if (renamed) set(renamed);
      });
    }
    return;
  }
  // A field inside repeater items: `$item.from` within the repeater, `repeater.<n>.from` and
  // `$this.from` over the repeater anywhere.
  const items: Json[] = [];
  eachElement(childrenOf(repeater) ?? [], (child) => items.push(...expressionsOf(child)));
  for (const expression of items) {
    walk(expression, (path, set) => {
      const renamed = renamedPath(path, ["$item"], from, to);
      if (renamed) set(renamed);
    });
  }
  for (const expression of allExpressions(doc)) {
    walk(expression, (path, set, arrayOver) => {
      const renamed =
        renamedPath(path, [repeater.key, "*"], from, to) ??
        (arrayOver === repeater.key ? renamedPath(path, ["$this"], from, to) : null);
      if (renamed) set(renamed);
    });
  }
}

const KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;
const MAX_DERIVED = 32;

/**
 * A key from a label: the label's Latin words in camelCase, at most 32 characters of whole
 * words ("Company legal name" → companyLegalName). Null when the label has no Latin words.
 */
export function keyFromLabel(label: string): string | null {
  const words = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[A-Za-z0-9]+/g);
  if (!words) return null;
  let key = "";
  for (const word of words) {
    const lower = word.toLowerCase();
    const next = key === "" ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    if (key !== "" && key.length + next.length > MAX_DERIVED) break;
    key += next;
  }
  if (/^[0-9]/.test(key)) key = `q${key}`;
  key = key.slice(0, 64);
  return KEY.test(key) ? key : null;
}

/** `base`, or `base2`, `base3`… : the first one no other element of `doc` uses. */
export function freeKey(doc: FormDocument, base: string, own: string): string {
  const keys = usedKeys(doc);
  keys.delete(own);
  if (!keys.has(base)) return base;
  for (let n = 2; ; n++) if (!keys.has(`${base}${n}`)) return `${base}${n}`;
}

/** Whether `key` is `base` or `base` followed by digits (as numbered by `uniqueKey`). */
function numbered(key: string, base: string | null): boolean {
  return base !== null && (key === base || new RegExp(`^${base}\\d+$`).test(key));
}

/**
 * Whether the key was generated rather than chosen: the default key of the element type, or the
 * key derived from its current label. Such keys follow the label as it is edited.
 */
export function isGeneratedKey(element: Element, label: string): boolean {
  const base =
    element.type === "boolean" ? "agree" : element.type === "repeater" ? "items" : element.type;
  return numbered(element.key, base) || numbered(element.key, keyFromLabel(label));
}
