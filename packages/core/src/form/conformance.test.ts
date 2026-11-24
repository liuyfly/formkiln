import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { FormDocument, JsonValue } from "@formkiln/spec";
import { describe, expect, it } from "vitest";
import { deepEqual } from "../expression/values";
import { validateAnswers } from "./answers";
import { validateDefinition } from "./definition";

const specDir = dirname(createRequire(import.meta.url).resolve("@formkiln/spec/package.json"));
const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"));
const namedCases = (suite: any): [string, any][] => suite.cases.map((c: any) => [c.name, c]);
const jsonFiles = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(dir, f));

for (const file of jsonFiles(join(specDir, "conformance", "validation"))) {
  const suite = readJson(file);
  describe(`validation conformance: ${file.split("/").pop()}`, () => {
    it.each(namedCases(suite))("%s", (_name, c: any) => {
      const form = suite.forms[c.form] as FormDocument;
      expect(validateDefinition(form), "the case form must be valid").toEqual([]);
      const result = validateAnswers(form, c.answers, {
        ...(c.now && { now: c.now }),
        ...(c.locale && { locale: c.locale }),
      });
      const expected = c.expected;

      // path and code always; message and params only when the case specifies them.
      const actualErrors = result.errors.map((error, i) => {
        const want = expected.errors[i] ?? {};
        return {
          path: error.path,
          code: error.code,
          ...("message" in want && { message: error.message }),
          ...("params" in want && { params: error.params }),
        };
      });
      expect(actualErrors).toEqual(expected.errors);
      expect(result.valid).toBe(expected.errors.length === 0);
      if ("inactive" in expected)
        expect([...result.inactive].sort()).toEqual([...expected.inactive].sort());
      if ("submission" in expected) {
        expect(
          deepEqual(result.submission, expected.submission as JsonValue),
          `submission ${JSON.stringify(result.submission)}`,
        ).toBe(true);
      }
      if ("outcome" in expected) expect(result.outcome).toBe(expected.outcome);
    });
  });
}

for (const file of jsonFiles(join(specDir, "conformance", "definitions"))) {
  const suite = readJson(file);
  describe(`definition conformance: ${file.split("/").pop()}`, () => {
    it.each(namedCases(suite))("%s", (_name, c: any) => {
      const key = (e: { pointer: string; code: string }) => `${e.code} ${e.pointer}`;
      const actual = validateDefinition(c.form).map(key).sort();
      expect(actual).toEqual(c.expected.map(key).sort());
    });
  });
}
