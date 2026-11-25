import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import caseFileSchema from "../conformance/expression-cases.schema.json" with { type: "json" };
import { FIELD_VALUE_TYPES, FORM_SCHEMA_V1, OPERATORS, SCHEMA_VERSION } from "./index";

const root = join(import.meta.dirname, "..");
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), "utf8"));

const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
const validateForm = ajv.compile(FORM_SCHEMA_V1);
const validateCaseFile = ajv.compile(caseFileSchema);

const example = readJson("examples/rental-application.json") as Record<string, unknown>;

/** Returns a deep copy of the example with `mutate` applied. */
function variant(mutate: (doc: any) => void): unknown {
  const doc = structuredClone(example);
  mutate(doc);
  return doc;
}

describe("form schema v1", () => {
  it("is version 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("accepts the rental application example", () => {
    const valid = validateForm(example);
    expect(validateForm.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it.each([
    ["an unknown top-level property", (d: any) => (d.colour = "red")],
    ["a missing schemaVersion", (d: any) => delete d.schemaVersion],
    ["schemaVersion 2", (d: any) => (d.schemaVersion = 2)],
    ["an invalid key", (d: any) => (d.key = "Rental-Application")],
    ["no pages", (d: any) => (d.pages = [])],
    ["a field without a label", (d: any) => delete d.pages[0].elements[2].label],
    ["an unknown field type", (d: any) => (d.pages[0].elements[2].type = "colour")],
    ["a choice field without options", (d: any) => delete d.pages[2].elements[0].options],
    ["an unknown operator", (d: any) => (d.pages[2].elements[1].visible = { "===": [1, 1] })],
    [
      "an operation with two operators",
      (d: any) => (d.pages[2].elements[1].visible = { "==": [1, 1], "!=": [1, 2] }),
    ],
    ["a hidden field without valueType", (d: any) => delete d.pages[2].elements[3].valueType],
    [
      "a nested repeater",
      (d: any) => d.pages[1].elements[2].elements.push(structuredClone(d.pages[1].elements[2])),
    ],
    [
      "an expression validator without message",
      (d: any) => delete d.pages[0].elements[4].validators[0].message,
    ],
    [
      "a redirect to a plain http URL",
      (d: any) => (d.submit.outcomes[1].redirect = "http://example.com"),
    ],
  ])("rejects %s", (_name, mutate) => {
    expect(validateForm(variant(mutate))).toBe(false);
  });

  it("accepts a layout grid and element widths", () => {
    const doc = variant((d: any) => {
      d.settings.layout = { columns: 4 };
      d.pages[0].elements[0].width = 4; // content
      d.pages[0].elements[1].width = 2; // field
      d.pages[1].elements[2].width = 3; // repeater
      d.pages[1].elements[2].elements[0].width = 1; // field in a repeater item
      d.pages[2].elements[1].width = 2; // panel
    });
    expect(validateForm(doc)).toBe(true);
  });

  it.each([
    ["a width of 0", (d: any) => (d.pages[0].elements[1].width = 0)],
    ["a width of 13", (d: any) => (d.pages[0].elements[1].width = 13)],
    ["a fractional width", (d: any) => (d.pages[0].elements[1].width = 1.5)],
    ["a width given as text", (d: any) => (d.pages[0].elements[1].width = "half")],
    ["a width on a page", (d: any) => (d.pages[0].width = 1)],
    ["0 columns", (d: any) => (d.settings.layout = { columns: 0 })],
    ["13 columns", (d: any) => (d.settings.layout = { columns: 13 })],
    ["an unknown layout property", (d: any) => (d.settings.layout = { gap: 8 })],
  ])("rejects %s", (_name, mutate) => {
    expect(validateForm(variant(mutate))).toBe(false);
  });

  it("assigns a value type to every field type except hidden", () => {
    expect(Object.keys(FIELD_VALUE_TYPES)).toHaveLength(16);
  });
});

describe("expression conformance cases", () => {
  const dir = "conformance/expressions";
  const files = readdirSync(join(root, dir)).filter((f) => f.endsWith(".json"));
  const used = new Set<string>();

  const collectOperators = (expr: unknown): void => {
    if (Array.isArray(expr)) {
      expr.forEach(collectOperators);
    } else if (expr !== null && typeof expr === "object") {
      for (const [op, args] of Object.entries(expr)) {
        used.add(op);
        collectOperators(args);
      }
    }
  };

  it.each(files)("%s is well-formed", (file) => {
    const suite = readJson(join(dir, file)) as { cases: { name: string; expression: unknown }[] };
    expect(validateCaseFile(suite), JSON.stringify(validateCaseFile.errors)).toBe(true);
    const names = suite.cases.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    suite.cases.forEach((c) => collectOperators(c.expression));
  });

  it("covers every operator and nothing else", () => {
    expect([...used].sort()).toEqual([...OPERATORS].sort());
  });
});
