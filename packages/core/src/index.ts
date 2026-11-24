import { SCHEMA_VERSION, type SchemaVersion } from "@formkiln/spec";

/**
 * Returns true when the engine can run a form built for the given schema version.
 * Placeholder until the schema migrator is implemented.
 */
export function isSupportedSchemaVersion(version: number): version is SchemaVersion {
  return version === SCHEMA_VERSION;
}
