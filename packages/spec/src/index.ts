/**
 * The current version of the Formkiln form schema format.
 * Bump only with a matching migrator in `@formkiln/core`.
 */
export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

/**
 * Value data types a field can declare. A field's value must always match its
 * declared data type; values are never inferred from their string shape.
 *
 * This list is a placeholder until the Schema v1 specification is finalised.
 */
export const DATA_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "string[]",
  "file",
] as const;

export type DataType = (typeof DATA_TYPES)[number];
