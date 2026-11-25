/** The element types the builder can add, with their defaults. */
import type { Element, FieldType, FormDocument } from "@formkiln/spec";
import { uniqueKey } from "./tree";

export type ElementType = FieldType | "content" | "panel" | "repeater";

export interface CatalogEntry {
  type: ElementType;
  label: string;
  group: "Basic" | "Choice" | "Date and time" | "Advanced" | "Layout";
  create: (doc: FormDocument) => Element;
}

const field =
  (type: FieldType, label: string, extra: Record<string, unknown> = {}) =>
  (doc: FormDocument): Element =>
    ({
      type,
      key: uniqueKey(doc, type === "boolean" ? "agree" : type),
      label,
      ...extra,
    }) as Element;

const options = () => [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
];

export const CATALOG: CatalogEntry[] = [
  { type: "text", label: "Short text", group: "Basic", create: field("text", "Short text") },
  { type: "textarea", label: "Long text", group: "Basic", create: field("textarea", "Long text") },
  { type: "number", label: "Number", group: "Basic", create: field("number", "Number") },
  {
    type: "email",
    label: "Email",
    group: "Basic",
    create: field("email", "Email", { autocomplete: "email" }),
  },
  {
    type: "phone",
    label: "Phone",
    group: "Basic",
    create: field("phone", "Phone", { autocomplete: "tel" }),
  },
  { type: "url", label: "Website", group: "Basic", create: field("url", "Website") },
  {
    type: "radio",
    label: "Single choice",
    group: "Choice",
    create: (doc) => field("radio", "Single choice", { options: options() })(doc),
  },
  {
    type: "select",
    label: "Dropdown",
    group: "Choice",
    create: (doc) => field("select", "Dropdown", { options: options() })(doc),
  },
  {
    type: "checkboxes",
    label: "Multiple choice",
    group: "Choice",
    create: (doc) => field("checkboxes", "Multiple choice", { options: options() })(doc),
  },
  { type: "boolean", label: "Yes / no", group: "Choice", create: field("boolean", "I agree") },
  { type: "date", label: "Date", group: "Date and time", create: field("date", "Date") },
  { type: "time", label: "Time", group: "Date and time", create: field("time", "Time") },
  {
    type: "datetime",
    label: "Date and time",
    group: "Date and time",
    create: field("datetime", "Date and time"),
  },
  { type: "name", label: "Name", group: "Advanced", create: field("name", "Full name") },
  { type: "address", label: "Address", group: "Advanced", create: field("address", "Address") },
  { type: "file", label: "File upload", group: "Advanced", create: field("file", "Upload a file") },
  {
    type: "hidden",
    label: "Hidden value",
    group: "Advanced",
    create: field("hidden", "Hidden value", { valueType: "string" }),
  },
  {
    type: "content",
    label: "Text block",
    group: "Layout",
    create: (doc) => ({
      type: "content",
      key: uniqueKey(doc, "content"),
      text: "Some text",
      format: "markdown",
    }),
  },
  {
    type: "panel",
    label: "Section",
    group: "Layout",
    create: (doc) => ({
      type: "panel",
      key: uniqueKey(doc, "section"),
      title: "Section",
      elements: [],
    }),
  },
  {
    type: "repeater",
    label: "Repeating group",
    group: "Layout",
    create: (doc) => ({
      type: "repeater",
      key: uniqueKey(doc, "items"),
      label: "Items",
      itemLabel: "Item",
      elements: [],
    }),
  },
];

export function catalogEntry(type: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.type === type);
}

/** Validators that make sense for a field type (Form Schema §7). */
export function validatorTypesFor(type: string): string[] {
  switch (type) {
    case "text":
    case "textarea":
    case "email":
    case "phone":
    case "url":
      return ["minLength", "maxLength", "pattern"];
    case "number":
      return ["min", "max", "integer"];
    case "checkboxes":
      return ["minItems", "maxItems"];
    case "file":
      return ["minItems", "maxItems", "maxFileSize", "fileTypes"];
    case "date":
    case "datetime":
      return ["minDate", "maxDate"];
    case "boolean":
      return ["equals"];
    default:
      return [];
  }
}

const PROBLEM_TEXT: Record<string, string> = {
  duplicateKey: "This key is used more than once.",
  duplicateOutcomeKey: "Two outcomes have the same key.",
  varPath: "An expression refers to a field that does not exist here.",
  unknownReference: "An expression refers to an unknown field.",
  arity: "An expression has the wrong number of arguments.",
  invalidPattern: "The pattern is not a valid portable regular expression.",
  cycle: "Calculations depend on each other in a loop.",
  valueType: "An expression or value has the wrong type.",
  duplicateOption: "Two options have the same value.",
  requiredParts: "Required parts must be among the shown parts.",
  validatorType: "This validator does not apply to this field type.",
  schema: "This does not match the form schema (a property is missing or has the wrong shape).",
  structure: "The document is not a form.",
  keyMismatch: "The form key must not change.",
};

export function problemText(code: string): string {
  return PROBLEM_TEXT[code] ?? code;
}
