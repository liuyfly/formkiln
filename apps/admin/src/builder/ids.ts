/**
 * Element ids (Form Schema §5.6): every element gets a random id that stays with it through
 * renames and moves; a copy gets a new one.
 */
import type { Element, FormDocument } from "@formkiln/spec";
import { produce } from "immer";
import { childrenOf } from "./tree";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A random id of 10 characters (about 52 bits), not in `taken`. */
export function newId(taken: ReadonlySet<string> = new Set()): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const id = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    if (!taken.has(id)) return id;
  }
}

function each(doc: FormDocument, visit: (element: Element) => void): void {
  const walk = (elements: Element[]) => {
    for (const element of elements) {
      visit(element);
      const children = childrenOf(element);
      if (children) walk(children);
    }
  };
  for (const page of doc.pages) walk(page.elements);
}

/** Whether some element has no id, or an id an earlier element already has. */
function needsIds(doc: FormDocument): boolean {
  const seen = new Set<string>();
  let missing = false;
  each(doc, (element) => {
    if (element.id === undefined || seen.has(element.id)) missing = true;
    else seen.add(element.id);
  });
  return missing;
}

/**
 * Gives every element without an id a new one, and a new one to every element whose id an
 * earlier element already has (a copy, pasted JSON). Returns `doc` itself when nothing changes.
 */
export function ensureIds(doc: FormDocument): FormDocument {
  if (!needsIds(doc)) return doc;
  return produce(doc, (draft) => {
    const all = new Set<string>();
    each(draft as FormDocument, (element) => {
      if (element.id !== undefined) all.add(element.id);
    });
    const seen = new Set<string>();
    each(draft as FormDocument, (element) => {
      if (element.id === undefined || seen.has(element.id)) {
        element.id = newId(all);
        all.add(element.id);
      }
      seen.add(element.id);
    });
  });
}

/** Element ids mapped to their keys (to follow renames against another version). */
export function keysById(doc: FormDocument): Map<string, string> {
  const result = new Map<string, string>();
  each(doc, (element) => {
    if (element.id !== undefined && !result.has(element.id)) result.set(element.id, element.key);
  });
  return result;
}
