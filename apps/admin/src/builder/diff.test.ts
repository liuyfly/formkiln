import type { FormDocument } from "@formkiln/spec";
import { describe, expect, it } from "vitest";
import { describeCondition, diffDocuments, lineDiff } from "./diff";

const before: FormDocument = {
  schemaVersion: 1,
  key: "f",
  title: "Survey",
  pages: [
    {
      key: "p1",
      title: "One",
      elements: [
        { type: "text", key: "name", label: "Name", required: true },
        {
          type: "radio",
          key: "status",
          label: "Status",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        { type: "email", key: "email", label: "Email" },
        {
          type: "repeater",
          key: "pets",
          label: "Pets",
          elements: [{ type: "text", key: "petName", label: "Pet" }],
        },
      ],
    },
    { key: "p2", elements: [] },
  ],
  submit: { outcomes: [{ key: "done", message: "Thanks" }] },
};

const after: FormDocument = {
  schemaVersion: 1,
  key: "f",
  title: "Customer survey",
  pages: [
    {
      key: "p1",
      title: "One",
      elements: [
        { type: "number", key: "name", label: "Full name" },
        {
          type: "radio",
          key: "status",
          label: "Status",
          options: [
            { value: "a", label: "Alpha" },
            { value: "c", label: "C" },
          ],
        },
        {
          type: "repeater",
          key: "pets",
          label: "Pets",
          elements: [{ type: "text", key: "petAge", label: "Age" }],
        },
        {
          type: "textarea",
          key: "notes",
          label: "Notes",
          visible: { "==": [{ var: "status" }, "c"] },
        },
      ],
    },
    { key: "p2", elements: [{ type: "email", key: "email", label: "Email" }] },
  ],
  submit: { outcomes: [{ key: "done", message: "Thank you" }, { key: "vip" }] },
};

describe("document diff", () => {
  it("describes field, page, outcome and form changes", () => {
    const diff = diffDocuments(before, after);
    expect(diff.form).toEqual([
      { kind: "changed", subject: "Form", details: ["Title: “Survey” → “Customer survey”"] },
      { kind: "changed", subject: "Outcome done", details: ["Message: “Thanks” → “Thank you”"] },
      { kind: "added", subject: "Outcome vip", details: [] },
    ]);
    expect(diff.pages).toEqual([]);
    const byPath = Object.fromEntries(diff.elements.map((c) => [c.subject, c]));
    expect(byPath["Field “Full name” (name)"]).toEqual({
      kind: "changed",
      subject: "Field “Full name” (name)",
      details: [
        "Type changed from text to number",
        "Label: “Name” → “Full name”",
        "Required: yes → no",
      ],
    });
    expect(byPath["Field “Status” (status)"]!.details).toEqual([
      "Options added: “C”",
      "Options removed: “B”",
      "Option a renamed from “A” to “Alpha”",
    ]);
    expect(byPath["Field “Email” (email)"]!.details).toEqual(["Moved from page p1 to page p2"]);
    expect(byPath["Field “Notes” (notes)"]!.kind).toBe("added");
    expect(byPath["Field “Age” (pets.petAge)"]!.kind).toBe("added");
    expect(byPath["Field “Pet” (pets.petName)"]!.kind).toBe("removed");
  });

  it("is empty for the same document", () => {
    expect(diffDocuments(before, structuredClone(before))).toEqual({
      form: [],
      pages: [],
      elements: [],
    });
  });

  it("describes conditions in words when it can", () => {
    expect(describeCondition({ "==": [{ var: "status" }, "c"] })).toBe("status is c");
    expect(
      describeCondition({ or: [{ empty: [{ var: "a" }] }, { "==": [{ var: "b" }, true] }] }),
    ).toBe("a is empty or b is yes");
    expect(describeCondition({ "+": [1, 2] })).toBe("a custom condition");
    expect(describeCondition(undefined)).toBe("no");
  });

  it("diffs lines", () => {
    expect(lineDiff("a\nb\nc\nd", "a\nc\nx\nd")).toEqual([
      { type: "same", text: "a" },
      { type: "removed", text: "b" },
      { type: "same", text: "c" },
      { type: "added", text: "x" },
      { type: "same", text: "d" },
    ]);
  });
});
