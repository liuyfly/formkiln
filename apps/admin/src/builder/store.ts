/**
 * Builder state: the document being edited, the selection, undo/redo history and save status.
 * Every edit goes through `edit`, which records history (consecutive edits with the same
 * `coalesce` key, such as typing in one input, become one undo step).
 */
import type { Element, FormDocument } from "@formkiln/spec";
import { enableMapSet, produce, type Draft } from "immer";
import { create } from "zustand";
import type { DefinitionError } from "../lib/api";
import {
  childrenOf,
  duplicate,
  elementAt,
  insertAt,
  insertElement,
  moveIntoPrevious,
  moveOut,
  moveTo,
  moveToPage,
  moveWithin,
  newPage,
  removeElement,
  type Loc,
  type Slot,
} from "./tree";

enableMapSet();

export type Selection =
  { kind: "form" } | { kind: "page"; page: number } | { kind: "element"; loc: Loc };

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;

interface State {
  document: FormDocument;
  selection: Selection;
  /** Page shown on the canvas. */
  page: number;
  past: FormDocument[];
  future: FormDocument[];
  lastCoalesce: { key: string; at: number } | null;
  /** Server state of the working copy. */
  revision: number;
  saveStatus: SaveStatus;
  problems: DefinitionError[];
  /** Increments on each edit so the autosaver knows what it saved. */
  version: number;
}

interface Actions {
  load: (document: FormDocument, revision: number, problems: DefinitionError[]) => void;
  edit: (recipe: (draft: Draft<FormDocument>) => void, coalesce?: string) => void;
  replace: (document: FormDocument) => void;
  undo: () => void;
  redo: () => void;
  select: (selection: Selection) => void;
  showPage: (page: number) => void;
  addElement: (element: Element) => void;
  /** Drops a new element at a slot; false when it is not allowed there. */
  insertElementAt: (element: Element, slot: Slot) => boolean;
  /** Moves an element to a slot; false when it is not allowed there. */
  moveElement: (from: Loc, slot: Slot) => boolean;
  removeSelected: () => void;
  duplicateSelected: () => void;
  moveSelected: (move: "up" | "down" | "into" | "out") => void;
  moveSelectedToPage: (page: number) => void;
  addPage: () => void;
  removePage: (page: number) => void;
  movePage: (page: number, delta: -1 | 1) => void;
  saved: (revision: number, problems: DefinitionError[], version: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export type BuilderStore = State & Actions;

export const useBuilder = create<BuilderStore>()((set, get) => {
  /** Applies a document change and records it for undo. */
  const commit = (next: FormDocument, extra: Partial<State> = {}, coalesce?: string) => {
    const state = get();
    if (next === state.document) {
      if (Object.keys(extra).length) set(extra);
      return;
    }
    const now = Date.now();
    const merge =
      coalesce !== undefined &&
      state.lastCoalesce?.key === coalesce &&
      now - state.lastCoalesce.at < COALESCE_MS &&
      state.past.length > 0;
    set({
      document: next,
      past: merge ? state.past : [...state.past, state.document].slice(-HISTORY_LIMIT),
      future: [],
      lastCoalesce: coalesce === undefined ? null : { key: coalesce, at: now },
      saveStatus: state.saveStatus === "conflict" ? "conflict" : "dirty",
      version: state.version + 1,
      ...extra,
    });
  };

  const selectedLoc = (): Loc | null => {
    const selection = get().selection;
    return selection.kind === "element" ? selection.loc : null;
  };

  return {
    document: { schemaVersion: 1, key: "", title: "", pages: [{ key: "page1", elements: [] }] },
    selection: { kind: "form" },
    page: 0,
    past: [],
    future: [],
    lastCoalesce: null,
    revision: 0,
    saveStatus: "saved",
    problems: [],
    version: 0,

    load: (document, revision, problems) =>
      set({
        document,
        revision,
        problems,
        selection: { kind: "form" },
        page: 0,
        past: [],
        future: [],
        lastCoalesce: null,
        saveStatus: "saved",
        version: 0,
      }),

    edit: (recipe, coalesce) => commit(produce(get().document, recipe), {}, coalesce),

    replace: (document) => commit(document, { selection: { kind: "form" }, page: 0 }),

    undo: () => {
      const { past, future, document, version } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({
        document: previous,
        past: past.slice(0, -1),
        future: [document, ...future],
        lastCoalesce: null,
        saveStatus: get().saveStatus === "conflict" ? "conflict" : "dirty",
        version: version + 1,
        ...clampSelection(previous, get()),
      });
    },

    redo: () => {
      const { past, future, document, version } = get();
      const next = future[0];
      if (!next) return;
      set({
        document: next,
        past: [...past, document],
        future: future.slice(1),
        lastCoalesce: null,
        saveStatus: get().saveStatus === "conflict" ? "conflict" : "dirty",
        version: version + 1,
        ...clampSelection(next, get()),
      });
    },

    select: (selection) =>
      set(
        selection.kind === "form"
          ? { selection }
          : { selection, page: selection.kind === "page" ? selection.page : selection.loc.page },
      ),

    showPage: (page) => set({ page, selection: { kind: "page", page } }),

    addElement: (element) => {
      const { page } = get();
      let loc: Loc | null = null;
      const next = produce(get().document, (draft) => {
        loc = insertElement(draft as FormDocument, page, element, selectedLoc());
      });
      commit(next, { selection: { kind: "element", loc: loc! } });
    },

    insertElementAt: (element, slot) => {
      let loc: Loc | null = null;
      const next = produce(get().document, (draft) => {
        loc = insertAt(draft as FormDocument, element, slot);
      });
      if (!loc) return false;
      commit(next, { selection: { kind: "element", loc }, page: slot.page });
      return true;
    },

    moveElement: (from, slot) => {
      let loc: Loc | null = null;
      const next = produce(get().document, (draft) => {
        loc = moveTo(draft as FormDocument, from, slot);
      });
      if (!loc) return false;
      commit(next, { selection: { kind: "element", loc }, page: (loc as Loc).page });
      return true;
    },

    removeSelected: () => {
      const loc = selectedLoc();
      if (!loc) return;
      const next = produce(get().document, (draft) => {
        removeElement(draft as FormDocument, loc);
      });
      commit(next, { selection: { kind: "page", page: loc.page } });
    },

    duplicateSelected: () => {
      const loc = selectedLoc();
      if (!loc) return;
      const element = elementAt(get().document, loc);
      if (!element) return;
      let target: Loc | null = null;
      const next = produce(get().document, (draft) => {
        const copy = duplicate(draft as FormDocument, element);
        // Insert right after the original, in the same list.
        const doc = draft as FormDocument;
        const list =
          loc.path.length > 1
            ? childrenOf(elementAt(doc, { page: loc.page, path: loc.path.slice(0, -1) }))!
            : doc.pages[loc.page]!.elements;
        const index = loc.path[loc.path.length - 1]! + 1;
        list.splice(index, 0, copy);
        target = { page: loc.page, path: [...loc.path.slice(0, -1), index] };
      });
      commit(next, { selection: { kind: "element", loc: target! } });
    },

    moveSelected: (move) => {
      const loc = selectedLoc();
      if (!loc) return;
      let target: Loc = loc;
      const next = produce(get().document, (draft) => {
        const doc = draft as FormDocument;
        target =
          move === "up"
            ? moveWithin(doc, loc, -1)
            : move === "down"
              ? moveWithin(doc, loc, 1)
              : move === "into"
                ? moveIntoPrevious(doc, loc)
                : moveOut(doc, loc);
      });
      commit(next, { selection: { kind: "element", loc: target } });
    },

    moveSelectedToPage: (page) => {
      const loc = selectedLoc();
      if (!loc) return;
      let target: Loc = loc;
      const next = produce(get().document, (draft) => {
        target = moveToPage(draft as FormDocument, loc, page);
      });
      commit(next, { selection: { kind: "element", loc: target }, page: target.page });
    },

    addPage: () => {
      const next = produce(get().document, (draft) => {
        draft.pages.push(newPage(draft as FormDocument));
      });
      const page = next.pages.length - 1;
      commit(next, { page, selection: { kind: "page", page } });
    },

    removePage: (page) => {
      if (get().document.pages.length <= 1) return;
      const next = produce(get().document, (draft) => {
        draft.pages.splice(page, 1);
      });
      const shown = Math.min(page, next.pages.length - 1);
      commit(next, { page: shown, selection: { kind: "page", page: shown } });
    },

    movePage: (page, delta) => {
      const target = page + delta;
      if (target < 0 || target >= get().document.pages.length) return;
      const next = produce(get().document, (draft) => {
        const [moved] = draft.pages.splice(page, 1);
        draft.pages.splice(target, 0, moved!);
      });
      commit(next, { page: target, selection: { kind: "page", page: target } });
    },

    saved: (revision, problems, version) =>
      set((state) => ({
        revision,
        problems,
        saveStatus: state.version === version ? "saved" : "dirty",
      })),

    setSaveStatus: (saveStatus) => set({ saveStatus }),
  };
});

/** Keeps the selection pointing at something that exists after undo or redo. */
function clampSelection(document: FormDocument, state: State): Partial<State> {
  const page = Math.min(state.page, document.pages.length - 1);
  const selection = state.selection;
  if (selection.kind === "element" && !elementAt(document, selection.loc)) {
    return { page, selection: { kind: "page", page } };
  }
  if (selection.kind === "page" && selection.page >= document.pages.length) {
    return { page, selection: { kind: "page", page } };
  }
  return { page };
}
