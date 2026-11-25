// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { FileRef, FormDocument } from "@formkiln/spec";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KilnForm, Markdown } from "./index";

afterEach(cleanup);

const page = (elements: FormDocument["pages"][number]["elements"]): FormDocument => ({
  schemaVersion: 1,
  key: "complex",
  title: "Complex",
  pages: [{ key: "main", title: "Main", elements }],
});

describe("composite fields", () => {
  const form = page([{ type: "name", key: "fullName", label: "Full name", required: true }]);

  it("renders one labelled input per part and stores an object", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<KilnForm form={form} onSubmit={onSubmit} />);
    const group = screen.getByRole("group", { name: "Full name" });
    await user.type(within(group).getByRole("textbox", { name: "First name" }), "Ada");
    await user.type(within(group).getByRole("textbox", { name: "Last name" }), "Lovelace");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({
      submission: { fullName: { given: "Ada", family: "Lovelace" } },
      outcome: null,
    });
  });

  it("shows a member error next to the member input", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} />);
    await user.type(screen.getByRole("textbox", { name: "First name" }), "Ada");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    const family = screen.getByRole("textbox", { name: "Last name" });
    expect(family.getAttribute("aria-invalid")).toBe("true");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Full name: This field is required",
    );
  });
});

describe("repeaters", () => {
  const form = page([
    {
      type: "repeater",
      key: "addresses",
      label: "Previous addresses",
      itemLabel: "Address",
      minItems: 1,
      maxItems: 2,
      elements: [
        { type: "text", key: "street", label: "Street", required: true },
        { type: "text", key: "note", label: "Note", visible: { "==": [{ var: "$index" }, 0] } },
      ],
    },
  ]);

  it("adds items, focuses the new item and limits the count", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} />);
    const add = screen.getByRole("button", { name: "Add Address" });
    await user.click(add);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Street" })),
    );
    expect(screen.getByRole("group", { name: "Address 1" })).toBeTruthy();

    await user.click(add);
    const second = screen.getByRole("group", { name: "Address 2" });
    expect(within(second).queryByRole("textbox", { name: /Note/ })).toBeNull();
    expect(add.hasAttribute("disabled") || add.getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("removes items and reports repeater and item errors", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} initialAnswers={{ addresses: [{ street: "A" }, {}] }} />);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Address 2 – Street: This field is required",
    );

    await user.click(screen.getByRole("button", { name: "Remove Address 2" }));
    await user.click(screen.getByRole("button", { name: "Remove Address 1" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Previous addresses: Select or add at least 1",
    );
  });
});

describe("file fields", () => {
  const form = page([
    {
      type: "file",
      key: "documents",
      label: "Documents",
      multiple: true,
      accept: ["application/pdf"],
      validators: [{ type: "maxFileSize", value: 1000 }],
    },
  ]);

  it("uploads through the host and lists the files", async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn(async (file: File): Promise<FileRef> => ({
      id: `id-${file.name}`,
      name: file.name,
      size: file.size,
      contentType: file.type,
    }));
    const { container } = render(<KilnForm form={form} uploadFile={uploadFile} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, [
      new File(["%PDF"], "small.pdf", { type: "application/pdf" }),
      new File(["x".repeat(2048)], "big.pdf", { type: "application/pdf" }),
    ]);
    expect(await screen.findByText("small.pdf")).toBeTruthy();
    expect(screen.getByText("big.pdf")).toBeTruthy();
    expect(uploadFile).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toContain("smaller than 1000 bytes");

    await user.click(screen.getByRole("button", { name: "Remove big.pdf" }));
    expect(screen.queryByText("big.pdf")).toBeNull();
  });

  it("reports failed uploads", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <KilnForm form={form} uploadFile={() => Promise.reject(new Error("offline"))} />,
    );
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, [
      new File(["%PDF"], "a.pdf", { type: "application/pdf" }),
    ]);
    expect((await screen.findByRole("alert")).textContent).toContain("a.pdf could not be uploaded");
  });

  it("is disabled without an uploadFile handler", () => {
    render(<KilnForm form={form} />);
    expect(screen.getByRole("button", { name: "Choose files" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("File upload is not available here.")).toBeTruthy();
  });
});

describe("Markdown", () => {
  it("renders the supported subset", () => {
    const { container } = render(
      <Markdown
        source={
          "Have your **bank details** and *ID* ready.\nSee [help](https://example.com).\n\n- one\n- two\n\n1. first"
        }
      />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("bank details");
    expect(container.querySelector("em")?.textContent).toBe("ID");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(container.querySelector("br")).toBeTruthy();
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(1);
  });

  it("never renders HTML or unsafe links", () => {
    const { container } = render(
      <Markdown source={'<img src=x onerror="alert(1)"> [click](javascript:alert(1))'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
    expect(container.textContent).toContain("[click](javascript:alert(1))");
  });
});

describe("accessibility", () => {
  const specDir = dirname(createRequire(import.meta.url).resolve("@formkiln/spec/package.json"));
  const example = JSON.parse(
    readFileSync(join(specDir, "examples", "rental-application.json"), "utf8"),
  ) as FormDocument;

  const violations = async (container: HTMLElement) => {
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  };

  it("has no axe violations on every page of the example, including errors", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <KilnForm
        form={example}
        now={() => new Date("2026-11-25T12:00:00Z")}
        initialAnswers={{ movedIn: "2025-01-01", previousAddresses: [{}] }}
        uploadFile={async (file) => ({
          id: "1",
          name: file.name,
          size: file.size,
          contentType: file.type,
        })}
      />,
    );
    expect(await violations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await violations(container)).toEqual([]);
  });

  it("has no axe violations on the later pages", async () => {
    const user = userEvent.setup();
    const address = { line1: "1 High Street", city: "Leeds", postalCode: "LS1 1AA" };
    const { container } = render(
      <KilnForm
        form={example}
        now={() => new Date("2026-11-25T12:00:00Z")}
        initialAnswers={{
          applicantName: { given: "Ada", family: "Lovelace" },
          email: "ada@example.com",
          phone: "+44 20 7946 0958",
          dateOfBirth: "1990-04-21",
          currentAddress: address,
          movedIn: "2025-01-01",
          previousAddresses: [{ address, from: "2020-01-01", to: "2024-12-31" }],
          employmentStatus: "employed",
          employerName: "Acme",
          annualIncome: 60000,
          monthlyRent: 1000,
        }}
      />,
    );
    for (const heading of ["Where you live", "Income", "Bank details"]) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await screen.findByRole("heading", { name: heading });
      expect(await violations(container), heading).toEqual([]);
    }
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("alert");
    expect(await violations(container), "bank page with errors").toEqual([]);
  });
});
