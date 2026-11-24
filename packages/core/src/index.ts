import { SCHEMA_VERSION, type SchemaVersion } from "@formkiln/spec";

export { evaluate, isTrue, type EvaluateOptions, type Scope } from "./expression/evaluate";
export { compilePortableRegex, type PortableRegexResult } from "./expression/regex";
export { validateDefinition } from "./form/definition";
export { validateAnswers, type FormEvaluation, type ValidateAnswersOptions } from "./form/answers";

/**
 * Returns true when the engine can run a form built for the given schema version.
 * Placeholder until the schema migrator is implemented.
 */
export function isSupportedSchemaVersion(version: number): version is SchemaVersion {
  return version === SCHEMA_VERSION;
}
