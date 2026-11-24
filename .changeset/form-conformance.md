---
"@formkiln/spec": minor
---

Define how answers are validated and add form-level conformance suites.

- Form Schema: type checking (§6.7), precise normalisation, submission data, the dependency graph, validator semantics, static error codes with JSON Pointer locations (§10), and the validation procedure, error order and precedence (§11).
- Operators: arity table and literal `var` paths.
- 62 validation cases (`conformance/validation`) and 36 definition cases (`conformance/definitions`), with schemas for both case formats.
- `ERROR_CODES`, `DEFINITION_ERROR_CODES` and `DefinitionError` exports; `ValidationResult` gains `outcome` and `submission`.
