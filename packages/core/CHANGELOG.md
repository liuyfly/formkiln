# @formkiln/core

## 0.3.0

### Minor Changes

- ace8590: Add `createFormController`: a framework-agnostic form session with answers, active pages, page navigation (`next`, `back`, `goTo`), touched-based error visibility, repeater item editing and an async `submit` flow that moves to the first error's page. It throws `FormDefinitionError` for invalid form documents.
- 8a3679b: `@formkiln/react`: add `<KilnForm />`, `useKilnForm` and `useFormState`. Built on React Aria Components: default fields for text, email, phone, URL, textarea, number, radio, select, checkboxes, boolean (checkbox, switch, yes/no), date, time and date-time; panels and plain content; paged and single navigation with progress; an error summary that receives focus and links to fields; localised interface strings (English, Simplified Chinese); replaceable field components; and an optional theme (`@formkiln/react/styles.css`) based on CSS custom properties, with dark mode.
  
  `@formkiln/core`: the form controller gains `isRequired(path)` and `isReadOnly(path)`.

### Patch Changes

- @formkiln/spec@0.3.0

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
