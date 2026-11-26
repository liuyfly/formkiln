/**
 * TypeScript types for Formkiln form documents, schema version 1.
 * Normative reference: docs/form-schema-v1.md and schema/form-v1.schema.json.
 */

/** Stable identifier: `^[a-z][a-zA-Z0-9_]{0,63}$`. */
export type Key = string;

/** BCP 47 language tag, e.g. `en` or `zh-CN`. */
export type Locale = string;

/** Plain text in the default locale, or a map of locale to text. */
export type Text = string | Readonly<Record<Locale, string>>;

/** Any JSON value. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Names of the operators defined in docs/operators-v1.md. */
export const OPERATORS = [
  "var",
  "and",
  "or",
  "!",
  "if",
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "min",
  "max",
  "round",
  "empty",
  "cat",
  "length",
  "lower",
  "upper",
  "matches",
  "date.today",
  "date.add",
  "date.diff",
  "in",
  "some",
  "all",
  "none",
  "map",
  "filter",
  "sum",
] as const;

export type Operator = (typeof OPERATORS)[number];

/** A literal, an array of expressions, or a single-operator operation. */
export type Expression =
  null | boolean | number | string | Expression[] | { readonly [op in Operator]?: Expression };

/** A boolean literal or an expression. Holds only when it evaluates to `true`. */
export type Condition = boolean | Expression;

/** Value types (docs/form-schema-v1.md §6.1). */
export const VALUE_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "time",
  "datetime",
  "string[]",
  "file[]",
  "name",
  "address",
  "item[]",
] as const;

export type ValueType = (typeof VALUE_TYPES)[number];

/** Value types a `hidden` field may declare. */
export type HiddenValueType = Exclude<ValueType, "item[]">;

export interface Settings {
  navigation?: "paged" | "single";
  timeZone?: string;
  defaultLocale?: Locale;
  locales?: Locale[];
  inactiveValues?: "retain" | "clear";
  layout?: Layout;
}

/** The layout grid (docs/form-schema-v1.md §5.5). */
export interface Layout {
  /** Equal columns of the grid, 1 to 12. Default 3. */
  columns?: number;
}

export interface FormDocument {
  $schema?: string;
  schemaVersion: 1;
  key: Key;
  title: Text;
  description?: Text;
  settings?: Settings;
  pages: Page[];
  submit?: { outcomes?: Outcome[] };
  meta?: Record<string, unknown>;
}

export interface Page {
  key: Key;
  title?: Text;
  description?: Text;
  visible?: Condition;
  elements: Element[];
  meta?: Record<string, unknown>;
}

interface ElementBase {
  /** Stable identifier across versions and key changes (docs/form-schema-v1.md §5.6). */
  id?: string;
  key: Key;
  visible?: Condition;
  /** Columns spanned on the container's grid (docs/form-schema-v1.md §5.5). Default: all. */
  width?: number;
  meta?: Record<string, unknown>;
}

export interface ContentElement extends ElementBase {
  type: "content";
  text: Text;
  format?: "plain" | "markdown";
}

export interface PanelElement<E = Element> extends ElementBase {
  type: "panel";
  title?: Text;
  description?: Text;
  elements: E[];
}

/** Elements allowed inside a repeater (no nested repeaters). */
export type ItemElement = ContentElement | PanelElement<ItemElement> | Field;

export interface RepeaterElement extends ElementBase {
  type: "repeater";
  label: Text;
  description?: Text;
  itemLabel?: Text;
  minItems?: number;
  maxItems?: number;
  elements: ItemElement[];
}

export type Element = ContentElement | PanelElement | RepeaterElement | Field;

export type Validator =
  | {
      type: "minLength" | "maxLength" | "minItems" | "maxItems" | "maxFileSize";
      value: number;
      message?: Text;
    }
  | { type: "min" | "max"; value: number; message?: Text }
  | { type: "pattern"; value: string; message?: Text }
  | { type: "minDate" | "maxDate"; value: string | Expression; message?: Text }
  | { type: "fileTypes"; value: string[]; message?: Text }
  | { type: "equals"; value: JsonValue; message?: Text }
  | { type: "integer"; message?: Text }
  | { type: "expression"; rule: Expression; message: Text };

export interface Option {
  value: string;
  label: Text;
}

interface FieldBase<T extends string> extends ElementBase {
  type: T;
  label: Text;
  hideLabel?: boolean;
  description?: Text;
  required?: Condition;
  requiredMessage?: Text;
  readOnly?: Condition;
  defaultValue?: JsonValue;
  calculate?: Expression;
  validators?: Validator[];
  sensitive?: boolean;
  autocomplete?: string;
}

export type NamePart = "title" | "given" | "middle" | "family";
export type AddressPart = "line1" | "line2" | "city" | "region" | "postalCode" | "country";

export type Field =
  | (FieldBase<"text" | "email" | "phone" | "url"> & { placeholder?: Text })
  | (FieldBase<"textarea"> & { placeholder?: Text; rows?: number })
  | (FieldBase<"number"> & { placeholder?: Text; prefix?: Text; suffix?: Text; step?: number })
  | (FieldBase<"radio" | "checkboxes"> & { options: Option[] })
  | (FieldBase<"select"> & { placeholder?: Text; options: Option[] })
  | (FieldBase<"boolean"> & { display?: "checkbox" | "switch" | "yesNo" })
  | FieldBase<"date" | "time" | "datetime">
  | (FieldBase<"file"> & { multiple?: boolean; accept?: string[] })
  | (FieldBase<"name"> & { parts?: NamePart[]; requiredParts?: NamePart[] })
  | (FieldBase<"address"> & { parts?: AddressPart[]; requiredParts?: AddressPart[] })
  | (FieldBase<"hidden"> & { valueType: HiddenValueType });

export type FieldType = Field["type"];

/** Value type of each field type (`hidden` declares its own). */
export const FIELD_VALUE_TYPES: Readonly<Record<Exclude<FieldType, "hidden">, ValueType>> = {
  text: "string",
  textarea: "string",
  email: "string",
  phone: "string",
  url: "string",
  number: "number",
  radio: "string",
  select: "string",
  checkboxes: "string[]",
  boolean: "boolean",
  date: "date",
  time: "time",
  datetime: "datetime",
  file: "file[]",
  name: "name",
  address: "address",
};

export interface Outcome {
  key: Key;
  when?: Condition;
  message?: Text;
  redirect?: string;
  meta?: Record<string, unknown>;
}

/** A reference to an uploaded file (docs/form-schema-v1.md §6.4). */
export interface FileRef {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

/** Error codes reported when validating answers (docs/form-schema-v1.md §11). */
export const ERROR_CODES = [
  "required",
  "type",
  "option",
  "format.email",
  "format.phone",
  "format.url",
  "minLength",
  "maxLength",
  "pattern",
  "min",
  "max",
  "integer",
  "minDate",
  "maxDate",
  "minItems",
  "maxItems",
  "maxFileSize",
  "fileType",
  "equals",
  "expression",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Error codes reported when validating a form document (docs/form-schema-v1.md §10). */
export const DEFINITION_ERROR_CODES = [
  "duplicateKey",
  "duplicateOutcomeKey",
  "varPath",
  "unknownReference",
  "arity",
  "invalidPattern",
  "cycle",
  "valueType",
  "duplicateOption",
  "requiredParts",
  "validatorType",
  "width",
  "duplicateId",
] as const;

export type DefinitionErrorCode = (typeof DEFINITION_ERROR_CODES)[number];

/** A static error in a form document, located by a JSON Pointer (RFC 6901). */
export interface DefinitionError {
  pointer: string;
  code: DefinitionErrorCode;
}

export interface ValidationError {
  path: string;
  code: ErrorCode;
  message?: string;
  params?: Record<string, JsonValue>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Key of the selected outcome, or null (docs/form-schema-v1.md §8). */
  outcome: string | null;
  /** Data to store: active, non-null values (docs/form-schema-v1.md §7.3). */
  submission: Record<string, JsonValue>;
}
