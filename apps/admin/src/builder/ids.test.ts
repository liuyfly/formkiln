import type { FormDocument } from "@formkiln/spec";
import { describe, expect, it } from "vitest";
import { diffDocuments } from "./diff";
import { ensureIds, keysById, newId } from "./ids";
import { duplicate } from "./tree";

const doc = (elements: unknown[]): FormDocument =>
  ({ schemaVersion: 1, key: "f", title: "F", pages: [{ key: "p", elements }] }) as FormDocument;

const ids = (d: FormDocument): (string | undefined)[] => {
  const out: (string | undefined)[] = [];
  const walk = (elements: any[]) =>
    elements.forEach((e) => {
      out.push(e.id);
      if (e.elements) walk(e.elements);
    });
  walk(d.pages[0]!.elements as any[]);
  return out;
};

describe("element ids", () => {
  it("generates ids the spec accepts", () => {
    for (let i = 0; i < 50; i++) expect(newId()).toMatch(/^[a-z0-9]{10}$/);
  });

  it("gives every element without an id one, at any depth", () => {
    const next = ensureIds(
      doc([
        { type: "text", key: "a", label: "a" },
        { type: "panel", key: "box", elements: [{ type: "text", key: "b", label: "b" }] },
      ]),
    );
    const all = ids(next);
    expect(all.every((id) => typeof id === "string")).toBe(true);
    expect(new Set(all).size).toBe(3);
  });

  it("keeps existing ids and returns the same document when nothing is missing", () => {
    const complete = doc([{ type: "text", id: "keep", key: "a", label: "a" }]);
    expect(ensureIds(complete)).toBe(complete);
  });

  it("gives a repeated id to the first element only", () => {
    const next = ensureIds(
      doc([
        { type: "text", id: "same", key: "a", label: "a" },
        { type: "text", id: "same", key: "b", label: "b" },
      ]),
    );
    const [first, second] = ids(next);
    expect(first).toBe("same");
    expect(second).not.toBe("same");
  });

  it("gives a duplicated element and its children new ids", () => {
    const original = ensureIds(
      doc([{ type: "panel", key: "box", elements: [{ type: "text", key: "b", label: "b" }] }]),
    );
    const copy = duplicate(original, original.pages[0]!.elements[0]!);
    expect(copy.id).toBeUndefined();
    expect((copy as any).elements[0].id).toBeUndefined();
  });

  it("maps ids to keys", () => {
    expect(keysById(doc([{ type: "text", id: "x1", key: "a", label: "a" }]))).toEqual(
      new Map([["x1", "a"]]),
    );
  });
});

describe("diff with ids", () => {
  it("reports a renamed key as one change, not a removal and an addition", () => {
    const before = doc([{ type: "text", id: "x1", key: "name", label: "Name" }]);
    const after = doc([{ type: "text", id: "x1", key: "fullName", label: "Full name" }]);
    const { elements } = diffDocuments(before, after);
    expect(elements).toHaveLength(1);
    expect(elements[0]!.kind).toBe("changed");
    expect(elements[0]!.details[0]).toBe("Key renamed from name to fullName");
  });

  it("still reports a removal and an addition without ids", () => {
    const before = doc([{ type: "text", key: "name", label: "Name" }]);
    const after = doc([{ type: "text", key: "fullName", label: "Name" }]);
    expect(
      diffDocuments(before, after)
        .elements.map((c) => c.kind)
        .sort(),
    ).toEqual(["added", "removed"]);
  });
});
