import { describe, expect, it } from "vitest";
import { DATA_TYPES, SCHEMA_VERSION } from "./index";

describe("@formkiln/spec", () => {
  it("exposes the schema version", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("declares unique data types", () => {
    expect(new Set(DATA_TYPES).size).toBe(DATA_TYPES.length);
  });
});
