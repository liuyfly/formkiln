import type { FormDocument } from "@formkiln/spec";
import { describe, expect, it } from "vitest";
import {
  groupToLogic,
  parseGroup,
  parseRule,
  referenceableFields,
  ruleToLogic,
  type Group,
  type Rule,
} from "./logic";

const rules: Rule[] = [
  { field: "status", op: "equals", value: "employed" },
  { field: "status", op: "notEquals", value: "student" },
  { field: "name", op: "contains", value: "Ltd" },
  { field: "pets", op: "notContains", value: "cat" },
  { field: "status", op: "anyOf", value: ["a", "b"] },
  { field: "rent", op: "lt", value: 1000 },
  { field: "rent", op: "lte", value: 1000 },
  { field: "rent", op: "gt", value: 0 },
  { field: "rent", op: "gte", value: 1.5 },
  { field: "movedIn", op: "before", value: "today" },
  { field: "movedIn", op: "after", value: "2024-01-31" },
  { field: "consent", op: "isTrue" },
  { field: "consent", op: "isNotTrue" },
  { field: "$item.city", op: "empty" },
  { field: "email", op: "notEmpty" },
];

describe("condition model", () => {
  it("serializes every operator to Formkiln JSON Logic and parses it back", () => {
    for (const rule of rules) {
      expect(parseRule(ruleToLogic(rule)), rule.op).toEqual(rule);
    }
    expect(ruleToLogic({ field: "movedIn", op: "before", value: "today" })).toEqual({
      ">": [{ "date.diff": [{ var: "movedIn" }, { "date.today": [] }, "day"] }, 0],
    });
    expect(ruleToLogic({ field: "pets", op: "contains", value: "cat" })).toEqual({
      in: ["cat", { var: "pets" }],
    });
  });

  it("round-trips groups, collapsing a single rule", () => {
    const group: Group = { combinator: "or", rules: rules.slice(0, 3) };
    expect(parseGroup(groupToLogic(group))).toEqual(group);
    expect(groupToLogic({ combinator: "and", rules: [rules[0]!] })).toEqual({
      "==": [{ var: "status" }, "employed"],
    });
    expect(parseGroup({ "==": [{ var: "status" }, "employed"] })).toEqual({
      combinator: "and",
      rules: [rules[0]],
    });
    expect(groupToLogic({ combinator: "and", rules: [] })).toBeUndefined();
  });

  it("accepts the unary shorthand of JSON Logic", () => {
    expect(parseRule({ empty: { var: "x" } })).toEqual({ field: "x", op: "empty" });
    expect(parseRule({ "!": { empty: { var: "x" } } })).toEqual({ field: "x", op: "notEmpty" });
  });

  it("leaves anything else to the JSON editor", () => {
    for (const expression of [
      { and: [{ "==": [{ var: "a" }, 1] }, { or: [{ "==": [{ var: "b" }, 2] }] }] },
      { "==": [{ var: "a" }, { var: "b" }] },
      { "<": [{ "date.diff": [{ var: "d" }, { "date.today": [] }, "year"] }, 18] },
      { "==": [{ "+": [{ var: "a" }, 1] }, 2] },
      { "==": [{ var: "a" }, [1, 2]] },
      { if: [true, true, false] },
      true,
    ]) {
      expect(parseGroup(expression), JSON.stringify(expression)).toBeNull();
    }
  });

  it("lists referenceable fields: outside repeaters by key, the same item inside one", () => {
    const doc: FormDocument = {
      schemaVersion: 1,
      key: "f",
      title: "F",
      settings: { defaultLocale: "en" },
      pages: [
        {
          key: "p",
          elements: [
            {
              type: "radio",
              key: "status",
              label: { en: "Status" },
              options: [{ value: "a", label: "A" }],
            },
            { type: "content", key: "intro", text: "Hi" },
            {
              type: "panel",
              key: "box",
              elements: [{ type: "number", key: "rent", label: "Rent" }],
            },
            {
              type: "repeater",
              key: "pets",
              label: "Pets",
              elements: [
                { type: "text", key: "petName", label: "Name" },
                { type: "boolean", key: "vaccinated", label: "Vaccinated" },
              ],
            },
          ],
        },
      ],
    };
    expect(referenceableFields(doc, null).map((f) => f.path)).toEqual(["status", "rent", "pets"]);
    expect(referenceableFields(doc, { page: 0, path: [0] }).map((f) => f.path)).toEqual([
      "rent",
      "pets",
    ]);
    const inside = referenceableFields(doc, { page: 0, path: [3, 1] });
    expect(inside.map((f) => f.path)).toEqual(["$item.petName", "status", "rent", "pets"]);
    expect(inside[1]!.options).toEqual([{ value: "a", label: "A" }]);
  });
});
