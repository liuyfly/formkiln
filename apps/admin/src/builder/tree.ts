/**
 * Addressing and editing the element tree of a form document. A location is a page index and a
 * path of element indexes (into `elements` of the page, then of panels and repeaters). All edits
 * mutate a draft (used inside immer `produce`).
 */
import type { Element, FormDocument, Page } from "@formkiln/spec";

export interface Loc {
  page: number;
  /** Element indexes from the page down; never empty. */
  path: number[];
}

export function isContainer(element: Element | undefined): boolean {
  return !!element && (element.type === "panel" || element.type === "repeater");
}

/**
 * The child list of a panel or repeater. Repeater children are typed `ItemElement` (no nested
 * repeaters); callers check that rule before inserting, so one list type is used here.
 */
export function childrenOf(element: Element | undefined): Element[] | undefined {
  return isContainer(element)
    ? (element as unknown as { elements: Element[] }).elements
    : undefined;
}

export function sameLoc(a: Loc | null | undefined, b: Loc | null | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.page === b.page &&
    a.path.length === b.path.length &&
    a.path.every((v, i) => v === b.path[i])
  );
}

/** The element list that holds the element at `path` (the page's, or a container's). */
function parentList(doc: FormDocument, page: number, path: number[]): Element[] | undefined {
  let list: Element[] | undefined = doc.pages[page]?.elements;
  for (const index of path.slice(0, -1)) {
    list = childrenOf(list?.[index]);
    if (!list) return undefined;
  }
  return list;
}

export function elementAt(doc: FormDocument, loc: Loc): Element | undefined {
  return parentList(doc, loc.page, loc.path)?.[loc.path[loc.path.length - 1]!];
}

/** JSON pointer of a location, as used by definition problems. */
export function pointerOf(loc: Loc): string {
  return `/pages/${loc.page}` + loc.path.map((index) => `/elements/${index}`).join("");
}

/** The deepest page or element a JSON pointer points into. */
export function locOfPointer(pointer: string): { page: number; path: number[] } | null {
  const match = /^\/pages\/(\d+)((?:\/elements\/\d+)*)/.exec(pointer);
  if (!match) return null;
  const path = [...match[2]!.matchAll(/\/elements\/(\d+)/g)].map((m) => Number(m[1]));
  return { page: Number(match[1]), path };
}

/** Every key used in the document (pages, elements, outcomes). */
export function usedKeys(doc: FormDocument): Set<string> {
  const keys = new Set<string>();
  const visit = (elements: Element[]) => {
    for (const element of elements) {
      keys.add(element.key);
      const children = childrenOf(element);
      if (children) visit(children);
    }
  };
  for (const page of doc.pages) {
    keys.add(page.key);
    visit(page.elements);
  }
  for (const outcome of doc.submit?.outcomes ?? []) keys.add(outcome.key);
  return keys;
}

/** `base`, `base2`, `base3`... the first that is not used. */
/** Keys of every element (not pages or outcomes). */
export function elementKeys(doc: FormDocument): Set<string> {
  const keys = new Set<string>();
  const visit = (elements: Element[]) => {
    for (const element of elements) {
      keys.add(element.key);
      const children = childrenOf(element);
      if (children) visit(children);
    }
  };
  for (const page of doc.pages) visit(page.elements);
  return keys;
}

export function uniqueKey(doc: FormDocument, base: string): string {
  const keys = usedKeys(doc);
  if (!keys.has(base)) return base;
  for (let n = 2; ; n++) if (!keys.has(`${base}${n}`)) return `${base}${n}`;
}

/**
 * Inserts `element` after `after` (same list), or inside a selected container, or at the end of
 * the page. Returns the new location.
 */
export function insertElement(
  doc: FormDocument,
  page: number,
  element: Element,
  after: Loc | null,
): Loc {
  if (after && after.page === page) {
    const children = childrenOf(elementAt(doc, after));
    if (children && !(element.type === "repeater" && hasRepeaterAncestorOrSelf(doc, after))) {
      children.push(element);
      return { page, path: [...after.path, children.length - 1] };
    }
    const list = parentList(doc, page, after.path);
    if (list) {
      const index = after.path[after.path.length - 1]! + 1;
      list.splice(index, 0, element);
      return { page, path: [...after.path.slice(0, -1), index] };
    }
  }
  const elements = doc.pages[page]!.elements;
  elements.push(element);
  return { page, path: [elements.length - 1] };
}

/** Repeaters cannot be nested (Form Schema §5.4). */
export function hasRepeaterAncestorOrSelf(doc: FormDocument, loc: Loc): boolean {
  for (let depth = 1; depth <= loc.path.length; depth++) {
    if (elementAt(doc, { page: loc.page, path: loc.path.slice(0, depth) })?.type === "repeater")
      return true;
  }
  return false;
}

export function removeElement(doc: FormDocument, loc: Loc): Element | undefined {
  const list = parentList(doc, loc.page, loc.path);
  return list?.splice(loc.path[loc.path.length - 1]!, 1)[0];
}

/** Moves an element up (-1) or down (+1) within its list. Returns the new location. */
export function moveWithin(doc: FormDocument, loc: Loc, delta: -1 | 1): Loc {
  const list = parentList(doc, loc.page, loc.path);
  const index = loc.path[loc.path.length - 1]!;
  const target = index + delta;
  if (!list || target < 0 || target >= list.length) return loc;
  const [element] = list.splice(index, 1);
  list.splice(target, 0, element!);
  return { page: loc.page, path: [...loc.path.slice(0, -1), target] };
}

/** Moves an element into the container just above it (at the end). */
export function moveIntoPrevious(doc: FormDocument, loc: Loc): Loc {
  const index = loc.path[loc.path.length - 1]!;
  if (index === 0) return loc;
  const previous = { page: loc.page, path: [...loc.path.slice(0, -1), index - 1] };
  const children = childrenOf(elementAt(doc, previous));
  const element = elementAt(doc, loc);
  if (!children || !element) return loc;
  if (element.type === "repeater" && hasRepeaterAncestorOrSelf(doc, previous)) return loc;
  removeElement(doc, loc);
  children.push(element);
  return { page: loc.page, path: [...previous.path, children.length - 1] };
}

/** Moves an element out of its container, just after it. */
export function moveOut(doc: FormDocument, loc: Loc): Loc {
  if (loc.path.length < 2) return loc;
  const element = removeElement(doc, loc);
  const parent = loc.path.slice(0, -1);
  const list = parentList(doc, loc.page, parent)!;
  const index = parent[parent.length - 1]! + 1;
  list.splice(index, 0, element!);
  return { page: loc.page, path: [...parent.slice(0, -1), index] };
}

/** Moves an element to the end of another page. */
export function moveToPage(doc: FormDocument, loc: Loc, page: number): Loc {
  if (page === loc.page || !doc.pages[page]) return loc;
  const element = removeElement(doc, loc)!;
  doc.pages[page]!.elements.push(element);
  return { page, path: [doc.pages[page]!.elements.length - 1] };
}

/** A deep copy of an element with fresh keys (for duplicating). */
export function duplicate(doc: FormDocument, element: Element): Element {
  const copy = structuredClone(element) as Element;
  const taken = usedKeys(doc);
  const rekey = (node: Element) => {
    let key = `${node.key}Copy`;
    for (let n = 2; taken.has(key); n++) key = `${node.key}Copy${n}`;
    taken.add(key);
    node.key = key;
    childrenOf(node)?.forEach(rekey);
  };
  rekey(copy);
  return copy;
}

export function newPage(doc: FormDocument): Page {
  return { key: uniqueKey(doc, `page${doc.pages.length + 1}`), elements: [] };
}

/** A position between elements: index `index` in the list of `parent` (empty = the page). */
export interface Slot {
  page: number;
  parent: number[];
  index: number;
}

function startsWith(path: number[], prefix: number[]): boolean {
  return prefix.length <= path.length && prefix.every((v, i) => path[i] === v);
}

function containsRepeater(element: Element): boolean {
  if (element.type === "repeater") return true;
  return childrenOf(element)?.some(containsRepeater) ?? false;
}

/** The list a slot points into, or undefined when the slot is not a list. */
function slotList(doc: FormDocument, slot: Slot): Element[] | undefined {
  return slot.parent.length === 0
    ? doc.pages[slot.page]?.elements
    : childrenOf(elementAt(doc, { page: slot.page, path: slot.parent }));
}

/** Whether `element` may be put into the list of `slot` (no repeater inside a repeater). */
export function canPlace(doc: FormDocument, element: Element, slot: Slot): boolean {
  if (!slotList(doc, slot)) return false;
  const insideRepeater =
    slot.parent.length > 0 &&
    hasRepeaterAncestorOrSelf(doc, { page: slot.page, path: slot.parent });
  return !(insideRepeater && containsRepeater(element));
}

/** Inserts a new element at a slot. Returns its location, or null when not allowed. */
export function insertAt(doc: FormDocument, element: Element, slot: Slot): Loc | null {
  if (!canPlace(doc, element, slot)) return null;
  const list = slotList(doc, slot)!;
  const index = Math.min(Math.max(slot.index, 0), list.length);
  list.splice(index, 0, element);
  return { page: slot.page, path: [...slot.parent, index] };
}

/**
 * Moves the element at `from` to a slot. Returns its new location, or null when the move is not
 * allowed (into itself or a descendant, or a repeater into a repeater).
 */
export function moveTo(doc: FormDocument, from: Loc, slot: Slot): Loc | null {
  const element = elementAt(doc, from);
  if (!element) return null;
  if (slot.page === from.page && startsWith(slot.parent, from.path)) return null;
  if (!canPlace(doc, element, slot)) return null;
  const target = { page: slot.page, parent: [...slot.parent], index: slot.index };
  if (target.page === from.page) {
    const depth = from.path.length - 1;
    const fromParent = from.path.slice(0, -1);
    const fromIndex = from.path[depth]!;
    if (startsWith(target.parent, fromParent) && target.parent.length > depth) {
      // The target list is inside a later sibling, whose index shifts down after removal.
      if (target.parent[depth]! > fromIndex) target.parent[depth]! -= 1;
    } else if (
      target.parent.length === fromParent.length &&
      startsWith(target.parent, fromParent)
    ) {
      // Same list: no-op when dropped onto its own position.
      if (target.index === fromIndex || target.index === fromIndex + 1) return from;
      if (target.index > fromIndex) target.index -= 1;
    }
  }
  removeElement(doc, from);
  const list = slotList(doc, target)!;
  const index = Math.min(Math.max(target.index, 0), list.length);
  list.splice(index, 0, element);
  return { page: target.page, path: [...target.parent, index] };
}

// ---------------------------------------------------------------- layout (Form Schema §5.5)

export const DEFAULT_COLUMNS = 3;

export function columnsOf(doc: FormDocument): number {
  return doc.settings?.layout?.columns ?? DEFAULT_COLUMNS;
}

function eachElement(elements: Element[], visit: (element: Element) => void): void {
  for (const element of elements) {
    visit(element);
    const children = childrenOf(element);
    if (children) eachElement(children, visit);
  }
}

/** Whether any element sets a width, which switches the form to the layout grid. */
export function usesWidths(doc: FormDocument): boolean {
  let found = false;
  for (const page of doc.pages)
    eachElement(page.elements, (e) => (found ||= e.width !== undefined));
  return found;
}

/**
 * Sets the number of columns (`undefined` = the default) and, in the same change, makes every
 * width fit: a width that no longer fits becomes the full row (no `width`).
 */
export function setColumns(doc: FormDocument, columns: number | undefined): void {
  const count = columns ?? DEFAULT_COLUMNS;
  for (const page of doc.pages) {
    eachElement(page.elements, (element) => {
      if (element.width !== undefined && element.width >= count) delete element.width;
    });
  }
  if (columns === undefined || columns === DEFAULT_COLUMNS) {
    if (doc.settings?.layout) delete doc.settings.layout.columns;
    if (doc.settings?.layout && Object.keys(doc.settings.layout).length === 0) {
      delete doc.settings.layout;
    }
    if (doc.settings && Object.keys(doc.settings).length === 0) delete doc.settings;
  } else {
    doc.settings ??= {};
    doc.settings.layout = { ...doc.settings.layout, columns };
  }
}
