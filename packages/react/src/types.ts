import type { Field, JsonValue } from "@formkiln/spec";
import type { ComponentType } from "react";
import type { Messages } from "./messages";

/** Props every field component receives. */
export interface FieldProps {
  field: Field;
  /** Value path: `key`, or `repeater.index.child`. */
  path: string;
  /** DOM id prefix that is unique within the page. */
  id: string;
  label: string;
  description?: string | undefined;
  placeholder?: string | undefined;
  value: JsonValue;
  onChange(value: JsonValue): void;
  onBlur(): void;
  /** Messages of the visible errors for this field (including composite members). */
  errorMessages: string[];
  isInvalid: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  locale: string;
  messages: Messages;
  /** Resolves a Text from the form document for the current locale. */
  text(text: Parameters<typeof import("./text").resolveText>[0]): string | undefined;
}

export type FieldComponent = ComponentType<FieldProps>;

/** Components by field type. Missing entries fall back to the defaults. */
export type FieldComponents = Partial<Record<Field["type"], FieldComponent>>;
