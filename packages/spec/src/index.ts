import formSchemaV1 from "../schema/form-v1.schema.json" with { type: "json" };

/**
 * The current version of the Formkiln form schema format.
 * Bump only with a matching migrator in `@formkiln/core`.
 */
export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

/** JSON Schema (draft 2020-12) for structural validation of v1 form documents. */
export const FORM_SCHEMA_V1: Readonly<Record<string, unknown>> = formSchemaV1;

export * from "./types";
