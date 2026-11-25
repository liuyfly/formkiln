import type { Element, Field, FormDocument } from "@formkiln/spec";
import { produce } from "immer";
import { describe, expect, it } from "vitest";
import {
  canPlace,
  duplicate,
  insertAt,
  moveTo,
  elementAt,
  insertElement,
  locOfPointer,
  moveIntoPrevious,
  moveOut,
  moveToPage,
  moveWithin,
  pointerOf,
  removeElement,
  setColumns,
  uniqueKey,
  usesWidths,
} from "./tree";

const text = (key: string): Field => ({ type: "text", key, label: key });

const doc: FormDocument = {
  schemaVersion: 1,
  key: "f",
  title: "F",
  pages: [
    {
      key: "p1",
      elements: [
        text("a"),
        { type: "panel", key: "box", elements: [text("b"), text("c")] },
        { type: "repeater", key: "pets", label: "Pets", elements: [text("petName")] },
      ],
    },
    { key: "p2", elements: [] },
  ],
};

const keysOf = (d: FormDocument, page = 0) =>
  JSON.stringify(d.pages[page]!.elements, (k, v) =>
    k === "label" || k === "type" ? undefined : v,
  );

describe("element tree", () => {
  it("addresses elements and pointers", () => {
    expect(elementAt(doc, { page: 0, path: [1, 1] })?.key).toBe("c");
    expect(pointerOf({ page: 0, path: [1, 1] })).toBe("/pages/0/elements/1/elements/1");
    expect(locOfPointer("/pages/0/elements/1/elements/1/label")).toEqual({ page: 0, path: [1, 1] });
    expect(locOfPointer("/pages/1/title")).toEqual({ page: 1, path: [] });
    expect(locOfPointer("/submit/outcomes/0")).toBeNull();
  });

  it("generates unused keys", () => {
    expect(uniqueKey(doc, "a")).toBe("a2");
    expect(uniqueKey(doc, "fresh")).toBe("fresh");
  });

  it("inserts after the selection, inside a selected container, or at the end", () => {
    let loc;
    const after = produce(doc, (d) => {
      loc = insertElement(d, 0, text("x"), { page: 0, path: [0] });
    });
    expect(loc).toEqual({ page: 0, path: [1] });
    expect(after.pages[0]!.elements[1]!.key).toBe("x");

    const inside = produce(doc, (d) => {
      loc = insertElement(d, 0, text("y"), { page: 0, path: [1] });
    });
    expect(loc).toEqual({ page: 0, path: [1, 2] });
    expect(elementAt(inside, { page: 0, path: [1, 2] })?.key).toBe("y");

    // A repeater is never put inside a repeater.
    const repeater: Element = { type: "repeater", key: "r", label: "R", elements: [] };
    const notNested = produce(doc, (d) => {
      loc = insertElement(d, 0, repeater, { page: 0, path: [2] });
    });
    expect(loc).toEqual({ page: 0, path: [3] });
    expect(notNested.pages[0]!.elements).toHaveLength(4);

    const end = produce(doc, (d) => {
      loc = insertElement(d, 1, text("z"), null);
    });
    expect(loc).toEqual({ page: 1, path: [0] });
    expect(end.pages[1]!.elements[0]!.key).toBe("z");
  });

  it("moves within a list, into the container above, out of it and to another page", () => {
    let loc;
    const down = produce(doc, (d) => {
      loc = moveWithin(d, { page: 0, path: [0] }, 1);
    });
    expect(loc).toEqual({ page: 0, path: [1] });
    expect(keysOf(down)).toMatch(/^\[\{"key":"box"/);

    const into = produce(down, (d) => {
      loc = moveIntoPrevious(d, { page: 0, path: [1] });
    });
    expect(loc).toEqual({ page: 0, path: [0, 2] });
    expect(elementAt(into, { page: 0, path: [0, 2] })?.key).toBe("a");

    const out = produce(into, (d) => {
      loc = moveOut(d, { page: 0, path: [0, 0] });
    });
    expect(loc).toEqual({ page: 0, path: [1] });
    expect(elementAt(out, { page: 0, path: [1] })?.key).toBe("b");

    const moved = produce(doc, (d) => {
      loc = moveToPage(d, { page: 0, path: [0] }, 1);
    });
    expect(loc).toEqual({ page: 1, path: [0] });
    expect(moved.pages[0]!.elements).toHaveLength(2);
  });

  it("removes and duplicates with fresh keys", () => {
    const removed = produce(doc, (d) => {
      removeElement(d, { page: 0, path: [1, 0] });
    });
    expect(elementAt(removed, { page: 0, path: [1, 0] })?.key).toBe("c");
    const copy = duplicate(doc, doc.pages[0]!.elements[1]!);
    expect(copy.key).toBe("boxCopy");
    expect((copy as { elements: Element[] }).elements.map((e) => e.key)).toEqual([
      "bCopy",
      "cCopy",
    ]);
  });

  it("moves to slots across lists with index adjustments", () => {
    let loc;
    // Same list, downwards: dropping before the third item lands as the second.
    const down = produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [0] }, { page: 0, parent: [], index: 2 });
    });
    expect(loc).toEqual({ page: 0, path: [1] });
    expect(down.pages[0]!.elements.map((e) => e.key)).toEqual(["box", "a", "pets"]);

    // Into a later sibling container: the container's index shifts after removal.
    const into = produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [0] }, { page: 0, parent: [1], index: 1 });
    });
    expect(loc).toEqual({ page: 0, path: [0, 1] });
    expect(elementAt(into, { page: 0, path: [0, 1] })?.key).toBe("a");

    // Out of a container to the page, and to another page.
    const out = produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [1, 1] }, { page: 0, parent: [], index: 0 });
    });
    expect(loc).toEqual({ page: 0, path: [0] });
    expect(out.pages[0]!.elements.map((e) => e.key)).toEqual(["c", "a", "box", "pets"]);
    const other = produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [2] }, { page: 1, parent: [], index: 0 });
    });
    expect(loc).toEqual({ page: 1, path: [0] });
    expect(other.pages[1]!.elements[0]!.key).toBe("pets");
  });

  it("refuses moves into itself and nested repeaters", () => {
    let loc: unknown = "unset";
    produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [1] }, { page: 0, parent: [1], index: 0 });
    });
    expect(loc).toBeNull();
    const nested = produce(doc, (d) => {
      d.pages[0]!.elements.push({
        type: "panel",
        key: "wrap",
        elements: [{ type: "repeater", key: "r", label: "R", elements: [] }],
      });
    });
    expect(
      canPlace(nested, nested.pages[0]!.elements[3]!, { page: 0, parent: [2], index: 0 }),
    ).toBe(false);
    expect(canPlace(nested, text("x"), { page: 0, parent: [2], index: 0 })).toBe(true);
    // Dropped onto its own position: unchanged.
    produce(doc, (d) => {
      loc = moveTo(d, { page: 0, path: [1] }, { page: 0, parent: [], index: 2 });
    });
    expect(loc).toEqual({ page: 0, path: [1] });
  });

  it("inserts new elements at slots", () => {
    let loc;
    const result = produce(doc, (d) => {
      loc = insertAt(d, text("n"), { page: 0, parent: [2], index: 0 });
    });
    expect(loc).toEqual({ page: 0, path: [2, 0] });
    expect(elementAt(result, { page: 0, path: [2, 0] })?.key).toBe("n");
  });
});

describe("layout", () => {
  const widths = (d: FormDocument) =>
    JSON.stringify(d.pages[0]!.elements, (k, v) =>
      k === "label" || k === "type" || k === "key" ? undefined : v,
    );

  it("notices widths at any depth", () => {
    expect(usesWidths(doc)).toBe(false);
    const nested = produce(doc, (d) => {
      ((d.pages[0]!.elements[1] as any).elements[0] as Element).width = 1;
    });
    expect(usesWidths(nested)).toBe(true);
  });

  it("drops widths that no longer fit when columns shrink", () => {
    const wide = produce(doc, (d) => {
      setColumns(d, 4);
      d.pages[0]!.elements[0]!.width = 3;
      (d.pages[0]!.elements[1] as any).elements[1].width = 1;
    });
    expect(wide.settings).toEqual({ layout: { columns: 4 } });
    const narrow = produce(wide, (d) => setColumns(d, 2));
    expect(narrow.settings).toEqual({ layout: { columns: 2 } });
    expect(narrow.pages[0]!.elements[0]!.width).toBeUndefined();
    expect((narrow.pages[0]!.elements[1] as any).elements[1].width).toBe(1);
    expect(widths(narrow)).toContain('"width":1');
  });

  it("removes the setting when going back to the default", () => {
    const six: FormDocument = produce(doc, (d) => setColumns(d, 6));
    const back = produce(six, (d) => setColumns(d, undefined));
    expect(back.settings).toBeUndefined();
  });
});
