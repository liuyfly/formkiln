import { describe, expect, it } from "vitest";
import { isSupportedSchemaVersion } from "./index";

describe("isSupportedSchemaVersion", () => {
  it("accepts the current schema version", () => {
    expect(isSupportedSchemaVersion(1)).toBe(true);
  });

  it("rejects unknown versions", () => {
    expect(isSupportedSchemaVersion(0)).toBe(false);
    expect(isSupportedSchemaVersion(2)).toBe(false);
  });
});
