// @vitest-environment jsdom
import type { FormDocument } from "@formkiln/spec";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KilnForm, type FieldProps } from "./index";

afterEach(cleanup);

const opts = (...values: string[]) => values.map((value) => ({ value, label: value }));

const form: FormDocument = {
  schemaVersion: 1,
  key: "application",
  title: "Application",
  settings: { defaultLocale: "en", locales: ["en", "zh-CN"] },
  pages: [
    {
      key: "about",
      title: { en: "About you", "zh-CN": "关于您" },
      elements: [
        { type: "text", key: "name", label: { en: "Name", "zh-CN": "姓名" }, required: true },
        { type: "email", key: "email", label: "Email" },
        {
          type: "radio",
          key: "status",
          label: "Status",
          required: true,
          options: opts("employed", "student"),
        },
        {
          type: "panel",
          key: "job",
          title: "Job",
          visible: { "==": [{ var: "status" }, "employed"] },
          elements: [{ type: "text", key: "employer", label: "Employer", required: true }],
        },
      ],
    },
    {
      key: "details",
      title: "Details",
      elements: [
        { type: "number", key: "rent", label: "Rent", required: true },
        { type: "boolean", key: "consent", label: "I agree", required: true },
      ],
    },
  ],
  submit: { outcomes: [{ key: "done", message: "All done!" }] },
};

describe("<KilnForm />", () => {
  it("renders the first page with labels and an optional marker", () => {
    render(<KilnForm form={form} />);
    expect(screen.getByRole("heading", { name: "About you" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeTruthy();
    expect(screen.getByText("(optional)")).toBeTruthy();
    expect(screen.getByText("Step 1 of 2")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Employer" })).toBeNull();
  });

  it("blocks Continue with an error summary and focuses it", async () => {
    const user = userEvent.setup();
    const onValidationError = vi.fn();
    render(<KilnForm form={form} onValidationError={onValidationError} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const summary = await screen.findByRole("alert");
    expect(summary.textContent).toContain("There is a problem");
    expect(summary.textContent).toContain("Name: This field is required");
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("aria-invalid")).toBe("true");
    expect(onValidationError).toHaveBeenCalledWith([
      { path: "name", code: "required" },
      { path: "status", code: "required" },
    ]);
  });

  it("moves focus to a field from the error summary", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("link", { name: "Name: This field is required" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
  });

  it("shows conditional panels and walks to submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onPageChange = vi.fn();
    render(<KilnForm form={form} onSubmit={onSubmit} onPageChange={onPageChange} />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
    await user.click(screen.getByRole("radio", { name: "employed" }));
    await user.type(await screen.findByRole("textbox", { name: "Employer" }), "Acme");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Details" })).toBeTruthy();
    expect(onPageChange).toHaveBeenCalledWith("details");
    await user.type(screen.getByRole("textbox", { name: "Rent" }), "1200");
    await user.click(screen.getByRole("checkbox", { name: "I agree" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("All done!")).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledWith({
      submission: { name: "Ada", status: "employed", employer: "Acme", rent: 1200, consent: true },
      outcome: "done",
    });
  });

  it("goes back to the previous page", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} initialAnswers={{ name: "Ada", status: "student" }} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Back" }));
    expect(await screen.findByRole("heading", { name: "About you" })).toBeTruthy();
  });

  it("keeps editing when the submit handler fails", async () => {
    const user = userEvent.setup();
    render(
      <KilnForm
        form={form}
        initialAnswers={{ name: "Ada", status: "student", rent: 900, consent: true }}
        onSubmit={() => Promise.reject(new Error("offline"))}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be sent");
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
  });

  it("uses the locale for form texts and interface strings", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} locale="zh-CN" />);
    expect(screen.getByRole("heading", { name: "关于您" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "下一步" }));
    expect((await screen.findByRole("alert")).textContent).toContain("姓名: 此项为必填项");
  });

  it("accepts custom field components", () => {
    const CustomText = (props: FieldProps) => (
      <output aria-label={props.label}>custom:{props.path}</output>
    );
    render(<KilnForm form={form} components={{ text: CustomText }} />);
    expect(screen.getByLabelText("Name").textContent).toBe("custom:name");
  });

  it("calls onChange with the answers", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KilnForm form={form} onChange={onChange} />);
    await user.type(screen.getByRole("textbox", { name: /Email/ }), "a");
    expect(onChange).toHaveBeenLastCalledWith({ email: "a" });
  });
});
