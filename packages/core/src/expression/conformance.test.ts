import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Expression, JsonValue } from "@formkiln/spec";
import { describe, expect, it } from "vitest";
import { evaluate, type Scope } from "./evaluate";
import { deepEqual, type JsonObject } from "./values";

interface ExpressionCase {
  name: string;
  expression: Expression;
  data?: JsonObject;
  scope?: Scope;
  now?: string;
  timeZone?: string;
  expected: JsonValue;
}

const specDir = dirname(createRequire(import.meta.url).resolve("@formkiln/spec/package.json"));
const casesDir = join(specDir, "conformance", "expressions");

for (const file of readdirSync(casesDir).filter((f) => f.endsWith(".json"))) {
  const suite = JSON.parse(readFileSync(join(casesDir, file), "utf8")) as {
    description: string;
    cases: ExpressionCase[];
  };

  describe(`conformance: ${file}`, () => {
    it.each(suite.cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
      const options = {
        ...(c.data && { data: c.data }),
        ...(c.scope && { scope: c.scope }),
        ...(c.now && { now: c.now }),
        ...(c.timeZone && { timeZone: c.timeZone }),
      };
      const actual = evaluate(c.expression, options);
      expect(
        deepEqual(actual, c.expected),
        `expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(actual)}`,
      ).toBe(true);
    });
  });
}
