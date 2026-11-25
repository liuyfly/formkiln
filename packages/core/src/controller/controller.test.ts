import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { FormDocument } from "@formkiln/spec";
import { describe, expect, it, vi } from "vitest";
import { createFormController, FormDefinitionError } from "./controller";

const opts = (...values: string[]) => values.map((value) => ({ value, label: value }));

const form: FormDocument = {
  schemaVersion: 1,
  key: "application",
  title: "Application",
  pages: [
    {
      key: "about",
      elements: [
        { type: "text", key: "name", label: "Name", required: true },
        { type: "name", key: "fullName", label: "Full name" },
        {
          type: "radio",
          key: "guarantor",
          label: "Guarantor",
          required: true,
          options: opts("yes", "no"),
        },
      ],
    },
    {
      key: "guarantorPage",
      visible: { "==": [{ var: "guarantor" }, "yes"] },
      elements: [{ type: "text", key: "guarantorName", label: "Guarantor name", required: true }],
    },
    {
      key: "history",
      elements: [
        {
          type: "repeater",
          key: "addresses",
          label: "Addresses",
          elements: [{ type: "text", key: "street", label: "Street", required: true }],
        },
      ],
    },
  ],
  submit: {
    outcomes: [
      { key: "withGuarantor", when: { "==": [{ var: "guarantor" }, "yes"] } },
      { key: "standard" },
    ],
  },
};

const paths = (errors: readonly { path: string }[]) => errors.map((error) => error.path);

describe("createFormController", () => {
  it("rejects an invalid form document", () => {
    const invalid = structuredClone(form);
    invalid.pages[0]!.elements.push({ type: "text", key: "name", label: "Duplicate" });
    expect(() => createFormController(invalid)).toThrow(FormDefinitionError);
  });

  it("starts on the first page with no visible errors", () => {
    const state = createFormController(form).getState();
    expect(state.currentPage).toBe("about");
    expect(state.pages).toEqual(["about", "history"]);
    expect(state.isFirstPage).toBe(true);
    expect(state.evaluation.valid).toBe(false);
    expect(state.visibleErrors).toEqual([]);
  });

  it("shows a field's errors once it is touched", () => {
    const controller = createFormController(form);
    controller.touch("name");
    expect(paths(controller.getState().visibleErrors)).toEqual(["name"]);
    expect(controller.errorsAt("guarantor")).toEqual([]);
  });

  it("shows composite member errors when the field is touched", () => {
    const controller = createFormController(form);
    controller.setValue("fullName", { given: "Ada" });
    controller.touch("fullName");
    expect(paths(controller.errorsAt("fullName"))).toEqual(["fullName.family"]);
  });

  it("blocks next() on page errors and reveals them", () => {
    const controller = createFormController(form);
    const result = controller.next();
    expect(result).toMatchObject({ ok: false, firstErrorPath: "name", page: "about" });
    expect(paths(controller.getState().visibleErrors)).toEqual(["name", "guarantor"]);
    expect(controller.getState().currentPage).toBe("about");
  });

  it("skips inactive pages and includes them when they become active", () => {
    const controller = createFormController(form, {
      initialAnswers: { name: "Ada", guarantor: "no" },
    });
    expect(controller.next()).toEqual({ ok: true });
    expect(controller.getState().currentPage).toBe("history");

    controller.back();
    controller.setValue("guarantor", "yes");
    expect(controller.getState().pages).toEqual(["about", "guarantorPage", "history"]);
    controller.next();
    expect(controller.getState().currentPage).toBe("guarantorPage");
  });

  it("leaves a page that becomes inactive", () => {
    const controller = createFormController(form, {
      initialAnswers: { name: "Ada", guarantor: "yes" },
    });
    controller.goTo("guarantorPage");
    controller.setValue("guarantor", "no");
    expect(controller.getState().currentPage).toBe("history");
  });

  it("submit() with errors shows all of them and moves to the first error's page", async () => {
    const controller = createFormController(form, {
      initialAnswers: { name: "Ada", guarantor: "yes", addresses: [{}] },
    });
    controller.goTo("history");
    const result = await controller.submit();
    expect(result).toMatchObject({
      ok: false,
      firstErrorPath: "guarantorName",
      page: "guarantorPage",
    });
    const state = controller.getState();
    expect(state.currentPage).toBe("guarantorPage");
    expect(state.submitAttempted).toBe(true);
    expect(paths(state.visibleErrors)).toEqual(["guarantorName", "addresses.0.street"]);
  });

  it("submit() calls the handler with the submission and outcome", async () => {
    const controller = createFormController(form, {
      initialAnswers: { name: "Ada", guarantor: "no", guarantorName: "stale" },
    });
    const handler = vi.fn();
    const result = await controller.submit(handler);
    expect(result).toEqual({
      ok: true,
      submission: { name: "Ada", guarantor: "no" },
      outcome: "standard",
    });
    expect(handler).toHaveBeenCalledWith({
      submission: { name: "Ada", guarantor: "no" },
      outcome: "standard",
    });
    expect(controller.getState()).toMatchObject({ status: "submitted", outcome: "standard" });
    await expect(controller.submit()).rejects.toThrow("submitted");
  });

  it("returns to editing when the handler fails", async () => {
    const controller = createFormController(form, {
      initialAnswers: { name: "Ada", guarantor: "no" },
    });
    await expect(
      controller.submit(() => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
    expect(controller.getState().status).toBe("editing");
  });

  it("edits repeater items by path", () => {
    const controller = createFormController(form);
    controller.addItem("addresses");
    controller.addItem("addresses");
    controller.setValue("addresses.1.street", "B");
    controller.touch("addresses.0.street");
    expect(controller.getState().answers.addresses).toEqual([{}, { street: "B" }]);
    expect(paths(controller.errorsAt("addresses"))).toEqual(["addresses.0.street"]);

    controller.removeItem("addresses", 0);
    expect(controller.getState().answers.addresses).toEqual([{ street: "B" }]);
    expect(controller.errorsAt("addresses")).toEqual([]);
  });

  it("notifies subscribers until they unsubscribe", () => {
    const controller = createFormController(form);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.setValue("name", "Ada");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    controller.setValue("name", "Bob");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("walks through the rental application example", async () => {
    const specDir = dirname(createRequire(import.meta.url).resolve("@formkiln/spec/package.json"));
    const example = JSON.parse(
      readFileSync(join(specDir, "examples", "rental-application.json"), "utf8"),
    ) as FormDocument;
    const controller = createFormController(example, {
      now: () => new Date("2026-11-25T12:00:00Z"),
    });

    controller.setValue("applicantName", { given: "Ada", family: "Lovelace" });
    controller.setValue("email", "ada@example.com");
    controller.setValue("phone", "+44 20 7946 0958");
    controller.setValue("dateOfBirth", "1990-04-21");
    expect(controller.next()).toEqual({ ok: true });

    controller.setValue("currentAddress", {
      line1: "1 High Street",
      city: "Leeds",
      postalCode: "LS1 1AA",
    });
    controller.setValue("movedIn", "2020-01-01");
    expect(controller.isActive("previousAddresses")).toBe(false);
    expect(controller.next()).toEqual({ ok: true });

    controller.setValue("employmentStatus", "employed");
    controller.setValue("employerName", "Acme");
    controller.setValue("annualIncome", 60000);
    controller.setValue("monthlyRent", 1000);
    expect(controller.next()).toEqual({ ok: true });

    controller.setValue("sortCode", "12-34-56");
    controller.setValue("accountNumber", "12345678");
    controller.setValue("consent", true);
    const result = await controller.submit();
    expect(result).toMatchObject({ ok: true, outcome: "standard" });
    expect(result.ok && result.submission.rentToIncomeRatio).toBe(0.2);
  });
});
