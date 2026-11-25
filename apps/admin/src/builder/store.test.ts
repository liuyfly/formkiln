import type { FormDocument } from "@formkiln/spec";
import { beforeEach, describe, expect, it } from "vitest";
import { useBuilder } from "./store";

const doc: FormDocument = {
  schemaVersion: 1,
  key: "f",
  title: "Form",
  pages: [{ key: "p1", elements: [{ type: "text", key: "a", label: "A" }] }],
};

describe("builder store", () => {
  beforeEach(() => useBuilder.getState().load(doc, 7, []));

  it("edits with undo and redo", () => {
    const store = useBuilder.getState();
    store.edit((d) => {
      d.title = "Survey";
    });
    expect(useBuilder.getState().document.title).toBe("Survey");
    expect(useBuilder.getState().saveStatus).toBe("dirty");
    useBuilder.getState().undo();
    expect(useBuilder.getState().document.title).toBe("Form");
    useBuilder.getState().redo();
    expect(useBuilder.getState().document.title).toBe("Survey");
  });

  it("merges consecutive edits of one input into one undo step", () => {
    for (const title of ["S", "Su", "Sur"]) {
      useBuilder.getState().edit((d) => {
        d.title = title;
      }, "form.title");
    }
    expect(useBuilder.getState().past).toHaveLength(1);
    useBuilder.getState().undo();
    expect(useBuilder.getState().document.title).toBe("Form");
  });

  it("adds, moves, duplicates and removes elements with the selection following", () => {
    const store = useBuilder.getState();
    store.select({ kind: "element", loc: { page: 0, path: [0] } });
    store.addElement({ type: "email", key: "email", label: "Email" });
    expect(useBuilder.getState().selection).toEqual({
      kind: "element",
      loc: { page: 0, path: [1] },
    });
    useBuilder.getState().moveSelected("up");
    expect(useBuilder.getState().document.pages[0]!.elements.map((e) => e.key)).toEqual([
      "email",
      "a",
    ]);
    useBuilder.getState().duplicateSelected();
    expect(useBuilder.getState().document.pages[0]!.elements.map((e) => e.key)).toEqual([
      "email",
      "emailCopy",
      "a",
    ]);
    useBuilder.getState().removeSelected();
    expect(useBuilder.getState().document.pages[0]!.elements.map((e) => e.key)).toEqual([
      "email",
      "a",
    ]);
    expect(useBuilder.getState().selection).toEqual({ kind: "page", page: 0 });
  });

  it("manages pages and keeps the selection valid on undo", () => {
    useBuilder.getState().addPage();
    expect(useBuilder.getState().document.pages.map((p) => p.key)).toEqual(["p1", "page2"]);
    expect(useBuilder.getState().page).toBe(1);
    useBuilder.getState().undo();
    expect(useBuilder.getState().page).toBe(0);
    expect(useBuilder.getState().selection).toEqual({ kind: "page", page: 0 });
  });

  it("tracks whether the latest edit was saved", () => {
    useBuilder.getState().edit((d) => {
      d.title = "A";
    });
    const saving = useBuilder.getState().version;
    useBuilder.getState().edit((d) => {
      d.title = "B";
    });
    useBuilder.getState().saved(8, [], saving);
    expect(useBuilder.getState().saveStatus).toBe("dirty");
    useBuilder.getState().saved(9, [], useBuilder.getState().version);
    expect(useBuilder.getState().saveStatus).toBe("saved");
    expect(useBuilder.getState().revision).toBe(9);
  });

  it("drops new and existing elements at slots", () => {
    const store = useBuilder.getState();
    expect(
      store.insertElementAt(
        { type: "number", key: "age", label: "Age" },
        { page: 0, parent: [], index: 0 },
      ),
    ).toBe(true);
    expect(useBuilder.getState().document.pages[0]!.elements.map((e) => e.key)).toEqual([
      "age",
      "a",
    ]);
    expect(
      useBuilder.getState().moveElement({ page: 0, path: [0] }, { page: 0, parent: [], index: 2 }),
    ).toBe(true);
    expect(useBuilder.getState().document.pages[0]!.elements.map((e) => e.key)).toEqual([
      "a",
      "age",
    ]);
    expect(useBuilder.getState().selection).toEqual({
      kind: "element",
      loc: { page: 0, path: [1] },
    });
    // Not a list: refused without a history entry.
    const before = useBuilder.getState().past.length;
    expect(
      useBuilder.getState().moveElement({ page: 0, path: [0] }, { page: 0, parent: [1], index: 0 }),
    ).toBe(false);
    expect(useBuilder.getState().past.length).toBe(before);
  });
});
