import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import definitionCasesSchema from "../conformance/definition-cases.schema.json" with { type: "json" };
import validationCasesSchema from "../conformance/validation-cases.schema.json" with { type: "json" };
import { DEFINITION_ERROR_CODES, ERROR_CODES, FORM_SCHEMA_V1 } from "./index";

const root = join(import.meta.dirname, "..");
const readJson = (path: string): any => JSON.parse(readFileSync(join(root, path), "utf8"));
const jsonFiles = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith(".json"));

const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
const validateForm = ajv.compile(FORM_SCHEMA_V1);
const validateValidationFile = ajv.compile(validationCasesSchema);
const validateDefinitionFile = ajv.compile(definitionCasesSchema);

/** Resolves an RFC 6901 JSON Pointer, or returns undefined. */
function resolvePointer(doc: unknown, pointer: string): unknown {
  if (pointer === "") return doc;
  let current: any = doc;
  for (const raw of pointer.slice(1).split("/")) {
    const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, token)) {
      return undefined;
    }
    current = current[token];
  }
  return current;
}

describe.each(jsonFiles("conformance/validation"))("validation cases: %s", (file) => {
  const suite = readJson(join("conformance/validation", file));

  it("matches the case-file schema", () => {
    expect(validateValidationFile(suite), JSON.stringify(validateValidationFile.errors)).toBe(true);
  });

  it.each(Object.keys(suite.forms))("form %s is structurally valid", (name) => {
    const valid = validateForm(suite.forms[name]);
    expect(valid, JSON.stringify(validateForm.errors)).toBe(true);
  });

  it("has unique case names that reference existing forms and known codes", () => {
    const names = suite.cases.map((c: any) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of suite.cases) {
      expect(Object.keys(suite.forms)).toContain(c.form);
      for (const error of c.expected.errors) {
        expect(ERROR_CODES).toContain(error.code);
      }
    }
  });
});

describe("definition cases", () => {
  const files = jsonFiles("conformance/definitions");

  it.each(files)("%s matches the case-file schema", (file) => {
    const suite = readJson(join("conformance/definitions", file));
    expect(validateDefinitionFile(suite), JSON.stringify(validateDefinitionFile.errors)).toBe(true);
  });

  const cases = files.flatMap((file) =>
    readJson(join("conformance/definitions", file)).cases.map((c: any) => [
      `${file}: ${c.name}`,
      c,
    ]),
  );

  it.each(cases)("%s is structurally valid with resolvable pointers", (_name, c: any) => {
    const valid = validateForm(c.form);
    expect(valid, JSON.stringify(validateForm.errors)).toBe(true);
    for (const error of c.expected) {
      expect(DEFINITION_ERROR_CODES).toContain(error.code);
      expect(resolvePointer(c.form, error.pointer), error.pointer).not.toBeUndefined();
    }
  });
});
