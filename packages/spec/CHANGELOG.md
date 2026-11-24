# @formkiln/spec

## 0.1.0

### Minor Changes

- 5adf85d: Add the draft Form Schema v1 specification, expression operator catalogue, JSON Schema, TypeScript types, a rental application example and the first expression conformance cases.

### Patch Changes

- 0ceb86f: Add the expression evaluator (`evaluate`, `isTrue`) and portable regular expression compiler (`compilePortableRegex`) to `@formkiln/core`. The evaluator passes every expression conformance case. The operator specification now defines the portable regex subset precisely, and non-array arguments to array operators behave like `null`.
