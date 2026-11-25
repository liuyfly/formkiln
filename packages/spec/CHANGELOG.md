# @formkiln/spec

## 0.4.0

### Patch Changes

- 1c0c373: Fix rules that reference a field later in the document. Activity, calculated values and effective values shared one cycle guard, so asking for the activity of a field while computing its effective value looked like a cycle: the referencing rule saw `null` and the referenced field was left out of the submission. Each kind of computation now has its own guard. New validation conformance cases cover forward references.

## 0.3.0

No changes in this release.

## 0.2.0

### Minor Changes

- 942280e: Define how answers are validated and add form-level conformance suites.
  
  - Form Schema: type checking (§6.7), precise normalisation, submission data, the dependency graph, validator semantics, static error codes with JSON Pointer locations (§10), and the validation procedure, error order and precedence (§11).
  - Operators: arity table and literal `var` paths.
  - 62 validation cases (`conformance/validation`) and 36 definition cases (`conformance/definitions`), with schemas for both case formats.
  - `ERROR_CODES`, `DEFINITION_ERROR_CODES` and `DefinitionError` exports; `ValidationResult` gains `outcome` and `submission`.

## 0.1.0

### Minor Changes

- 5adf85d: Add the draft Form Schema v1 specification, expression operator catalogue, JSON Schema, TypeScript types, a rental application example and the first expression conformance cases.

### Patch Changes

- 0ceb86f: Add the expression evaluator (`evaluate`, `isTrue`) and portable regular expression compiler (`compilePortableRegex`) to `@formkiln/core`. The evaluator passes every expression conformance case. The operator specification now defines the portable regex subset precisely, and non-array arguments to array operators behave like `null`.
