import { describe, expect, it } from "vitest";
import { formatSize, humanize, previewText } from "./answers";

describe("answer display", () => {
  it("humanizes answer keys", () => {
    expect(humanize("firstName")).toBe("First name");
    expect(humanize("monthly_rent")).toBe("Monthly rent");
    expect(humanize("ssn")).toBe("Ssn");
  });

  it("previews values on one line", () => {
    const file = { id: "1", name: "id.pdf", size: 10, contentType: "application/pdf" };
    expect(previewText("Ada")).toBe("Ada");
    expect(previewText(1200)).toBe("1200");
    expect(previewText(null)).toBe("");
    expect(previewText("••••")).toBe("");
    expect(previewText([file, { ...file, id: "2", name: "b.png" }])).toBe("id.pdf, b.png");
    expect(previewText([{ a: 1 }, { a: 2 }])).toBe("2 items");
    expect(previewText({ first: "Ada", last: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("formats file sizes", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.0 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
