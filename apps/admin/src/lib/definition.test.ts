import { describe, expect, it } from "vitest";
import { fieldInfo, orderedEntries, withOptionLabels } from "./definition";

const definition = {
  schemaVersion: 1,
  key: "apply",
  settings: { defaultLocale: "zh-CN" },
  pages: [
    {
      key: "p",
      elements: [
        { type: "text", key: "name", label: { en: "Name", "zh-CN": "姓名" } },
        {
          type: "panel",
          key: "job",
          title: "Job",
          elements: [
            {
              type: "radio",
              key: "status",
              label: "Status",
              options: [{ value: "employed", label: { "zh-CN": "在职" } }],
            },
          ],
        },
        {
          type: "repeater",
          key: "pets",
          label: "Pets",
          elements: [{ type: "text", key: "petName", label: "Pet name" }],
        },
      ],
    },
  ],
};

describe("definition display", () => {
  it("collects labels in document order with the default locale", () => {
    const fields = fieldInfo(definition);
    expect([...fields.keys()]).toEqual(["name", "status", "pets", "petName"]);
    expect(fields.get("name")?.label).toBe("姓名");
    expect(fields.has("job")).toBe(false);
  });

  it("shows option labels", () => {
    const status = fieldInfo(definition).get("status");
    expect(withOptionLabels("employed", status)).toBe("在职");
    expect(withOptionLabels(["employed", "other"], status)).toEqual(["在职", "other"]);
    expect(withOptionLabels(3, status)).toBe(3);
  });

  it("orders data like the form", () => {
    const fields = fieldInfo(definition);
    expect(
      orderedEntries({ extra: 1, status: "employed", name: "Ada" }, fields).map(([key]) => key),
    ).toEqual(["name", "status", "extra"]);
  });
});
