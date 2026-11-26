import type { FormDocument } from "@formkiln/spec";
import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { freeKey, isGeneratedKey, keyFromLabel, renameElement } from "./rename";

const doc = {
  schemaVersion: 1,
  key: "f",
  title: "F",
  pages: [
    {
      key: "p1",
      elements: [
        { type: "text", key: "text", label: "Company" },
        {
          type: "text",
          key: "textOther",
          label: "Other",
          visible: { "!": { empty: { var: "text" } } },
        },
        { type: "name", key: "person", label: "Name" },
        {
          type: "panel",
          key: "box",
          visible: { "==": [{ var: "person.given" }, "Ada"] },
          elements: [
            {
              type: "number",
              key: "total",
              label: "Total",
              calculate: { "+": [{ var: ["text", 0] }, 1] },
              validators: [
                {
                  type: "expression",
                  rule: { "!=": [{ var: "$value" }, { var: "text" }] },
                  message: "x",
                },
              ],
            },
          ],
        },
        {
          type: "repeater",
          key: "pets",
          label: "Pets",
          elements: [
            { type: "text", key: "petName", label: "Pet name" },
            {
              type: "text",
              key: "note",
              label: "Note",
              required: { empty: { var: "$item.petName" } },
            },
          ],
        },
        {
          type: "boolean",
          key: "anyRex",
          label: "Any Rex",
          calculate: {
            some: [
              { var: "pets" },
              { "==": [{ var: "$this.petName" }, { var: "pets.0.petName" }] },
            ],
          },
        },
        {
          type: "boolean",
          key: "other",
          label: "Other array",
          calculate: { some: [{ var: "textOther" }, { "==": [{ var: "$this.petName" }, "x"] }] },
        },
      ],
    },
  ],
  submit: { outcomes: [{ key: "done", when: { "==": [{ var: "text" }, "a"] } }] },
} as unknown as FormDocument;

const json = (d: FormDocument) => JSON.stringify(d);

describe("renameElement", () => {
  it("renames a top-level field everywhere it is referenced, and nothing else", () => {
    const next = produce(doc, (d) => renameElement(d, { page: 0, path: [0] }, "company"));
    const text = json(next);
    expect(text).not.toMatch(/"var":"text"/);
    expect(text).toContain('{"var":"company"}');
    expect(text).toContain('{"var":["company",0]}');
    expect(text).toContain('"key":"company"');
    // A key that only starts with the old one is untouched.
    expect(text).toContain('{"var":"textOther"}');
    expect(next.submit?.outcomes?.[0]?.when).toEqual({ "==": [{ var: "company" }, "a"] });
  });

  it("renames member paths of a composite field", () => {
    const next = produce(doc, (d) => renameElement(d, { page: 0, path: [2] }, "applicant"));
    expect(json(next)).toContain('{"var":"applicant.given"}');
  });

  it("renames a repeater and its item paths", () => {
    const next = produce(doc, (d) => renameElement(d, { page: 0, path: [4] }, "animals"));
    const text = json(next);
    expect(text).toContain('{"var":"animals"}');
    expect(text).toContain('{"var":"animals.0.petName"}');
    expect(text).not.toMatch(/"var":"pets/);
  });

  it("renames a field inside repeater items in its own scopes only", () => {
    const next = produce(doc, (d) => renameElement(d, { page: 0, path: [4, 0] }, "petLabel"));
    const text = json(next);
    expect(text).toContain('{"var":"$item.petLabel"}');
    expect(text).toContain('{"var":"pets.0.petLabel"}');
    // `$this` over the pets repeater follows; `$this` over another array does not.
    const anyRex = (next.pages[0]!.elements[5] as any).calculate;
    expect(JSON.stringify(anyRex)).toContain('{"var":"$this.petLabel"}');
    const other = (next.pages[0]!.elements[6] as any).calculate;
    expect(JSON.stringify(other)).toContain('{"var":"$this.petName"}');
  });

  it("does nothing when the key does not change", () => {
    expect(produce(doc, (d) => renameElement(d, { page: 0, path: [0] }, "text"))).toBe(doc);
  });
});

describe("keyFromLabel", () => {
  it.each([
    ["Company legal name", "companyLegalName"],
    ["VAT Registration Number ", "vatRegistrationNumber"],
    ["Café owner's e-mail?", "cafeOwnerSEMail"],
    ["2nd address", "q2ndAddress"],
    ["Total number of active tenancies where you collect rent", "totalNumberOfActiveTenancies"],
    ["公司名称", null],
    ["", null],
  ])("%s → %s", (label, key) => {
    expect(keyFromLabel(label)).toBe(key);
  });
});

describe("generated keys", () => {
  it("recognises type defaults and keys derived from the label", () => {
    const field = (key: string) => ({ type: "text", key, label: "x" }) as any;
    expect(isGeneratedKey(field("text"), "Company")).toBe(true);
    expect(isGeneratedKey(field("text3"), "Company")).toBe(true);
    expect(isGeneratedKey(field("company"), "Company")).toBe(true);
    expect(isGeneratedKey(field("company2"), "Company")).toBe(true);
    expect(isGeneratedKey(field("legalName"), "Company")).toBe(false);
    expect(isGeneratedKey({ type: "boolean", key: "agree2", label: "x" } as any, "Terms")).toBe(
      true,
    );
  });

  it("numbers a derived key that another element already uses", () => {
    expect(freeKey(doc, "textOther", "text")).toBe("textOther2");
    expect(freeKey(doc, "text", "text")).toBe("text");
  });
});
