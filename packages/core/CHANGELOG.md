# @formkiln/core

## 0.2.0

### Minor Changes

- 9646f9d: Add `validateDefinition` (static validity, Form Schema §10) and `validateAnswers` (normalisation, type checking, visibility, calculated fields, validation, outcome and submission, §11). Both pass every validation and definition conformance case of `@formkiln/spec`.

### Patch Changes

- Updated dependencies [942280e]
  - @formkiln/spec@0.2.0

## 0.1.0

### Minor Changes

- 0ceb86f: Add the expression evaluator (`evaluate`, `isTrue`) and portable regular expression compiler (`compilePortableRegex`) to `@formkiln/core`. The evaluator passes every expression conformance case. The operator specification now defines the portable regex subset precisely, and non-array arguments to array operators behave like `null`.

### Patch Changes

- Updated dependencies [0ceb86f]
- Updated dependencies [5adf85d]
  - @formkiln/spec@0.1.0
