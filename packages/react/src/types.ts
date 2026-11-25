import type { Field, FileRef, JsonValue } from "@formkiln/spec";
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
  /** Messages of the visible errors for this field (including composite members and files). */
  errorMessages: string[];
  /** Messages of the visible errors on the field itself (excluding members and files). */
  fieldErrorMessages: string[];
  /** Messages of the visible errors at a member path, for example `family` or `0`. */
  errorsAt(member: string): string[];
  isInvalid: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  locale: string;
  messages: Messages;
  /** Resolves a Text from the form document for the current locale. */
  text(text: Parameters<typeof import("./text").resolveText>[0]): string | undefined;
  /** Uploads a file; absent when the host does not support uploads. */
  uploadFile?: UploadFile;
}

/** Uploads a file selected in a file field and resolves to its reference (Form Schema §6.4). */
export type UploadFile = (file: File, context: { field: Field; path: string }) => Promise<FileRef>;

export type FieldComponent = ComponentType<FieldProps>;

/** Components by field type. Missing entries fall back to the defaults. */
export type FieldComponents = Partial<Record<Field["type"], FieldComponent>>;
