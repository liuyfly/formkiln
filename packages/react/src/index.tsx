import { isSupportedSchemaVersion } from "@formkiln/core";

export interface KilnFormProps {
  /** Key of the published form to render. */
  formKey: string;
  /** Schema version of the form definition. Defaults to the current version. */
  schemaVersion?: number;
}

/**
 * Renders a Formkiln form.
 * Placeholder: the real renderer is built in Phase 1.
 */
export function KilnForm({ formKey, schemaVersion = 1 }: KilnFormProps) {
  if (!isSupportedSchemaVersion(schemaVersion)) {
    return <div role="alert">Unsupported schema version: {schemaVersion}</div>;
  }
  return <div data-formkiln-form={formKey} />;
}
