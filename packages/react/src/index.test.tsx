// @vitest-environment jsdom
import type { FormDocument } from "@formkiln/spec";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KilnForm, SubmitError, type FieldProps } from "./index";

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

  it("shows a field's error on blur, but only after a press elsewhere is released", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={form} />);
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.type(name, "Ada");
    const email = screen.getByRole("textbox", { name: /Email/ });
    await user.type(email, "nope");
    await user.tab();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    cleanup();

    render(<KilnForm form={form} />);
    const fresh = screen.getByRole("textbox", { name: /Email/ });
    await user.type(fresh, "nope");
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("button", { name: "Continue" }),
    });
    // Pressed, not released: the layout must not change under the pointer yet.
    expect(fresh.getAttribute("aria-invalid")).not.toBe("true");
    await user.pointer({
      keys: "[/MouseLeft]",
      target: screen.getByRole("button", { name: "Continue" }),
    });
    // The click went through: Continue validated the page.
    expect((await screen.findByRole("alert")).textContent).toContain("There is a problem");
    await waitFor(() => expect(fresh.getAttribute("aria-invalid")).toBe("true"));
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

  it("shows the message of a SubmitError", async () => {
    const user = userEvent.setup();
    render(
      <KilnForm
        form={form}
        initialAnswers={{ name: "Ada", status: "student", rent: 900, consent: true }}
        onSubmit={() => Promise.reject(new SubmitError("Verification failed."))}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Verification failed.");
  });

  it("renders beforeSubmit on the last page only", async () => {
    const user = userEvent.setup();
    render(
      <KilnForm
        form={form}
        initialAnswers={{ name: "Ada", status: "student" }}
        beforeSubmit={<p>verify</p>}
      />,
    );
    expect(screen.queryByText("verify")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("verify")).toBeTruthy();
  });

  it("does not repeat the form title as a page heading", () => {
    const untitled: FormDocument = {
      ...form,
      pages: [{ key: "only", elements: [{ type: "text", key: "name", label: "Name" }] }],
    };
    render(<KilnForm form={untitled} />);
    expect(screen.queryByRole("heading", { name: "Application" })).toBeNull();
    expect(document.querySelector("section.fk-page")?.getAttribute("aria-labelledby")).toBeNull();
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

describe("layout grid", () => {
  const layoutForm: FormDocument = {
    schemaVersion: 1,
    key: "contact",
    title: "Contact",
    pages: [
      {
        key: "main",
        elements: [
          { type: "text", key: "given", label: "First name", width: 1 },
          { type: "text", key: "family", label: "Last name", width: 2 },
          { type: "hidden", key: "source", label: "Source", valueType: "string", width: 1 },
          { type: "radio", key: "kind", label: "Kind", options: opts("person", "company") },
          {
            type: "text",
            key: "company",
            label: "Company",
            width: 1,
            visible: { "==": [{ var: "kind" }, "company"] },
          },
          {
            type: "panel",
            key: "address",
            title: "Address",
            width: 2,
            elements: [
              { type: "text", key: "city", label: "City", width: 2 },
              { type: "text", key: "postcode", label: "Postcode", width: 1 },
            ],
          },
          {
            type: "repeater",
            key: "lines",
            label: "Lines",
            minItems: 1,
            elements: [
              { type: "text", key: "item", label: "Item", width: 2 },
              { type: "number", key: "qty", label: "Quantity", width: 1 },
            ],
          },
        ],
      },
    ],
  };

  const cellOf = (label: string) =>
    screen
      .getByRole("textbox", { name: new RegExp(`^${label}`) })
      .closest(".fk-cell") as HTMLElement | null;

  it("places elements with a width in cells spanning that many columns", () => {
    const { container } = render(<KilnForm form={layoutForm} />);
    expect(container.querySelector(".fk-form")?.hasAttribute("data-fk-layout")).toBe(true);
    const grid = container.querySelector("section .fk-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--fk-columns")).toBe("3");
    expect(cellOf("First name")?.style.getPropertyValue("--fk-span")).toBe("1");
    expect(cellOf("Last name")?.style.getPropertyValue("--fk-span")).toBe("2");
    // Elements without a width span the whole row, without a cell.
    expect(screen.getByRole("radiogroup", { name: /^Kind/ }).closest(".fk-cell")).toBeNull();
  });

  it("gives panels and repeater items their own grid", async () => {
    const user = userEvent.setup();
    render(<KilnForm form={layoutForm} />);
    const city = cellOf("City");
    expect(city?.style.getPropertyValue("--fk-span")).toBe("2");
    expect(city?.parentElement?.closest(".fk-panel")).not.toBeNull();
    const panelCell = screen.getByRole("group", { name: "Address" }).closest(".fk-cell");
    expect((panelCell as HTMLElement).style.getPropertyValue("--fk-span")).toBe("2");
    await user.click(screen.getByRole("button", { name: "Add Lines" }));
    expect(cellOf("Quantity")?.style.getPropertyValue("--fk-span")).toBe("1");
    expect(cellOf("Quantity")?.closest(".fk-repeater-item")).not.toBeNull();
  });

  it("gives no cell to hidden fields and inactive elements", async () => {
    const user = userEvent.setup();
    const { container } = render(<KilnForm form={layoutForm} />);
    const top = container.querySelector("section .fk-grid") as HTMLElement;
    const topCells = () =>
      Array.from(top.children).filter((el) => el.classList.contains("fk-cell"));
    // given, family, panel: the hidden field and the inactive company field take no cell.
    expect(topCells()).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: "company" }));
    expect(topCells()).toHaveLength(4);
    expect(cellOf("Company")?.style.getPropertyValue("--fk-span")).toBe("1");
  });

  it("keeps forms without widths on the plain flow", () => {
    const { container } = render(<KilnForm form={form} />);
    expect(container.querySelector(".fk-form")?.hasAttribute("data-fk-layout")).toBe(false);
    expect(container.querySelector(".fk-grid")).toBeNull();
  });

  it("uses the columns of settings.layout", () => {
    const { container } = render(
      <KilnForm
        form={{
          ...layoutForm,
          settings: { layout: { columns: 4 } },
        }}
      />,
    );
    const grid = container.querySelector("section .fk-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--fk-columns")).toBe("4");
  });
});
