import { validateDefinition } from "@formkiln/core";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s is a valid form", (_, template) => {
    expect(validateDefinition(template.document)).toEqual([]);
  });

  it("have unique ids", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });
});
