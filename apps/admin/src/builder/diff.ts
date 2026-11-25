/**
 * Differences between two form documents, for people: which fields, pages, outcomes and form
 * settings were added, removed or changed, and how. Plus a line diff of the JSON.
 */
import type { Element, FormDocument, Option, Text } from "@formkiln/spec";
import { OPERATOR_LABELS, parseGroup } from "./logic";
import { childrenOf } from "./tree";

export interface Change {
  kind: "added" | "removed" | "changed";
  /** What changed, for example `Field “Email” (email)`. */
  subject: string;
  /** Details of a change: one line per property. */
  details: string[];
}

export interface DocumentDiff {
  form: Change[];
  pages: Change[];
  elements: Change[];
}

const TYPE_NAMES: Record<string, string> = {
  content: "Text block",
  panel: "Section",
  repeater: "Repeating group",
};

function text(value: Text | undefined, locale: string): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : (value[locale] ?? Object.values(value)[0] ?? "");
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const quote = (value: string) => (value ? `“${value}”` : "empty");

/** A condition in words when the visual model can express it. */
export function describeCondition(condition: unknown): string {
  if (condition === undefined || condition === false) return "no";
  if (condition === true) return "yes";
  const group = parseGroup(condition);
  if (!group) return "a custom condition";
  const rules = group.rules.map((rule) => {
    const value =
      rule.value === undefined
        ? ""
        : ` ${Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value)}`;
    return `${rule.field} ${OPERATOR_LABELS[rule.op]}${value}`;
  });
  return rules.join(group.combinator === "and" ? " and " : " or ");
}

interface Located {
  element: Element;
  page: string;
  parent: string | null;
}

/** Elements by answer path (`key`, or `repeater.child`), with where they are. */
function index(doc: FormDocument): Map<string, Located> {
  const result = new Map<string, Located>();
  const visit = (
    elements: Element[],
    page: string,
    parent: string | null,
    repeater: string | null,
  ) => {
    for (const element of elements) {
      const path = repeater ? `${repeater}.${element.key}` : element.key;
      if (!result.has(path)) result.set(path, { element, page, parent });
      const children = childrenOf(element);
      if (children)
        visit(children, page, element.key, element.type === "repeater" ? element.key : repeater);
    }
  };
  for (const page of doc.pages) visit(page.elements, page.key, null, null);
  return result;
}

function describeElement(element: Element, path: string, locale: string): string {
  const any = element as unknown as Record<string, unknown>;
  const name = text((any.label ?? any.title) as Text | undefined, locale);
  const kind = TYPE_NAMES[element.type] ?? "Field";
  return `${kind} ${name ? `“${name}” ` : ""}(${path})`;
}

function optionChanges(
  before: Option[] | undefined,
  after: Option[] | undefined,
  locale: string,
): string[] {
  if (!before && !after) return [];
  const a = new Map((before ?? []).map((o) => [o.value, text(o.label, locale)]));
  const b = new Map((after ?? []).map((o) => [o.value, text(o.label, locale)]));
  const lines: string[] = [];
  const added = [...b.keys()].filter((v) => !a.has(v));
  const removed = [...a.keys()].filter((v) => !b.has(v));
  if (added.length) lines.push(`Options added: ${added.map((v) => quote(b.get(v)!)).join(", ")}`);
  if (removed.length)
    lines.push(`Options removed: ${removed.map((v) => quote(a.get(v)!)).join(", ")}`);
  for (const [value, label] of b) {
    if (a.has(value) && a.get(value) !== label)
      lines.push(`Option ${value} renamed from ${quote(a.get(value)!)} to ${quote(label)}`);
  }
  const order = (list: Option[] | undefined) =>
    (list ?? []).map((o) => o.value).filter((v) => a.has(v) && b.has(v));
  if (!added.length && !removed.length && !same(order(before), order(after)))
    lines.push("Options reordered");
  return lines;
}

const TEXT_PROPERTIES: [string, string][] = [
  ["label", "Label"],
  ["title", "Title"],
  ["description", "Help text"],
  ["placeholder", "Placeholder"],
  ["itemLabel", "Item label"],
  ["text", "Text"],
];

const CONDITIONS: [string, string][] = [
  ["required", "Required"],
  ["visible", "Shown when"],
  ["readOnly", "Read only"],
];

const VALUES: [string, string][] = [
  ["sensitive", "Sensitive"],
  ["hideLabel", "Label hidden"],
  ["multiple", "Several files"],
  ["accept", "Accepted types"],
  ["minItems", "Minimum items"],
  ["maxItems", "Maximum items"],
  ["valueType", "Value type"],
  ["format", "Text format"],
  ["display", "Display"],
  ["parts", "Parts"],
  ["prefix", "Prefix"],
  ["suffix", "Suffix"],
  ["step", "Step"],
  ["rows", "Rows"],
  ["defaultValue", "Default value"],
  ["autocomplete", "Autocomplete"],
];

function elementDetails(before: Located, after: Located, locale: string): string[] {
  const a = before.element as unknown as Record<string, unknown>;
  const b = after.element as unknown as Record<string, unknown>;
  const lines: string[] = [];
  if (a.type !== b.type) lines.push(`Type changed from ${a.type} to ${b.type}`);
  if (before.page !== after.page)
    lines.push(`Moved from page ${before.page} to page ${after.page}`);
  else if (before.parent !== after.parent) {
    lines.push(
      `Moved ${after.parent ? `into ${after.parent}` : "out of"} ${before.parent && !after.parent ? before.parent : ""}`.trim(),
    );
  }
  for (const [property, label] of TEXT_PROPERTIES) {
    if (!same(a[property], b[property])) {
      const from = text(a[property] as Text | undefined, locale);
      const to = text(b[property] as Text | undefined, locale);
      lines.push(
        from === to ? `${label}: translations changed` : `${label}: ${quote(from)} → ${quote(to)}`,
      );
    }
  }
  for (const [property, label] of CONDITIONS) {
    if (!same(a[property], b[property]))
      lines.push(`${label}: ${describeCondition(a[property])} → ${describeCondition(b[property])}`);
  }
  lines.push(
    ...optionChanges(a.options as Option[] | undefined, b.options as Option[] | undefined, locale),
  );
  if (!same(a.validators, b.validators)) lines.push("Validation rules changed");
  if (!same(a.calculate, b.calculate)) lines.push("Calculation changed");
  for (const [property, label] of VALUES) {
    if (!same(a[property], b[property])) {
      const show = (v: unknown) => (v === undefined ? "not set" : JSON.stringify(v));
      lines.push(`${label}: ${show(a[property])} → ${show(b[property])}`);
    }
  }
  return lines;
}

function keyedChanges<T extends { key: string }>(
  before: T[],
  after: T[],
  subject: (item: T) => string,
  details: (a: T, b: T) => string[],
): Change[] {
  const a = new Map(before.map((item) => [item.key, item]));
  const b = new Map(after.map((item) => [item.key, item]));
  const changes: Change[] = [];
  for (const item of after) {
    const previous = a.get(item.key);
    if (!previous) changes.push({ kind: "added", subject: subject(item), details: [] });
    else {
      const lines = details(previous, item);
      if (lines.length) changes.push({ kind: "changed", subject: subject(item), details: lines });
    }
  }
  for (const item of before)
    if (!b.has(item.key)) changes.push({ kind: "removed", subject: subject(item), details: [] });
  return changes;
}

export function diffDocuments(before: FormDocument, after: FormDocument): DocumentDiff {
  const locale = after.settings?.defaultLocale ?? before.settings?.defaultLocale ?? "en";

  const form: Change[] = [];
  const formLines: string[] = [];
  if (!same(before.title, after.title))
    formLines.push(
      `Title: ${quote(text(before.title, locale))} → ${quote(text(after.title, locale))}`,
    );
  if (!same(before.description, after.description)) formLines.push("Description changed");
  if (!same(before.settings, after.settings))
    formLines.push(
      `Settings: ${JSON.stringify(before.settings ?? {})} → ${JSON.stringify(after.settings ?? {})}`,
    );
  if (formLines.length) form.push({ kind: "changed", subject: "Form", details: formLines });
  form.push(
    ...keyedChanges(
      before.submit?.outcomes ?? [],
      after.submit?.outcomes ?? [],
      (o) => `Outcome ${o.key}`,
      (a, b) => {
        const lines: string[] = [];
        if (!same(a.message, b.message))
          lines.push(
            `Message: ${quote(text(a.message, locale))} → ${quote(text(b.message, locale))}`,
          );
        if (!same(a.when, b.when))
          lines.push(`Chosen when: ${describeCondition(a.when)} → ${describeCondition(b.when)}`);
        if (!same(a.redirect, b.redirect))
          lines.push(`Redirect: ${a.redirect ?? "none"} → ${b.redirect ?? "none"}`);
        return lines;
      },
    ),
  );

  const pages = keyedChanges(
    before.pages,
    after.pages,
    (p) => `Page ${text(p.title, locale) ? `“${text(p.title, locale)}” ` : ""}(${p.key})`,
    (a, b) => {
      const lines: string[] = [];
      if (!same(a.title, b.title))
        lines.push(`Title: ${quote(text(a.title, locale))} → ${quote(text(b.title, locale))}`);
      if (!same(a.description, b.description)) lines.push("Description changed");
      if (!same(a.visible, b.visible))
        lines.push(`Shown when: ${describeCondition(a.visible)} → ${describeCondition(b.visible)}`);
      return lines;
    },
  );
  const order = (doc: FormDocument, others: FormDocument) =>
    doc.pages.map((p) => p.key).filter((k) => others.pages.some((o) => o.key === k));
  if (!same(order(before, after), order(after, before)))
    pages.push({ kind: "changed", subject: "Pages", details: ["Pages reordered"] });

  const a = index(before);
  const b = index(after);
  const elements: Change[] = [];
  for (const [path, located] of b) {
    const previous = a.get(path);
    if (!previous)
      elements.push({
        kind: "added",
        subject: describeElement(located.element, path, locale),
        details: [],
      });
    else {
      const lines = elementDetails(previous, located, locale);
      if (lines.length)
        elements.push({
          kind: "changed",
          subject: describeElement(located.element, path, locale),
          details: lines,
        });
    }
  }
  for (const [path, located] of a) {
    if (!b.has(path))
      elements.push({
        kind: "removed",
        subject: describeElement(located.element, path, locale),
        details: [],
      });
  }
  return { form, pages, elements };
}

export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

/** A line diff (longest common subsequence). */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  // Trim the common head and tail so the table stays small.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const lcs: number[][] = Array.from({ length: midA.length + 1 }, () =>
    new Array<number>(midB.length + 1).fill(0),
  );
  for (let i = midA.length - 1; i >= 0; i--) {
    for (let j = midB.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        midA[i] === midB[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const middle: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < midA.length && j < midB.length) {
    if (midA[i] === midB[j]) {
      middle.push({ type: "same", text: midA[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!)
      middle.push({ type: "removed", text: midA[i++]! });
    else middle.push({ type: "added", text: midB[j++]! });
  }
  while (i < midA.length) middle.push({ type: "removed", text: midA[i++]! });
  while (j < midB.length) middle.push({ type: "added", text: midB[j++]! });
  return [
    ...a.slice(0, start).map((text) => ({ type: "same" as const, text })),
    ...middle,
    ...a.slice(endA).map((text) => ({ type: "same" as const, text })),
  ];
}
