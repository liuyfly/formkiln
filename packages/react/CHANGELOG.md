# @formkiln/react

## 0.3.0

### Minor Changes

- 6eb8900: Support every Form Schema v1 element: name and address fields (one labelled input per part, member errors next to inputs), repeaters (item cards, add and remove, `$index`-driven visibility, focus on the new item), file uploads through a host `uploadFile` callback (upload status, per-file errors, removal), and a safe Markdown subset for content. Field components receive `fieldErrorMessages` and `errorsAt(member)`. Accessibility is checked with axe-core on every page of the example form.
- 8a3679b: `@formkiln/react`: add `<KilnForm />`, `useKilnForm` and `useFormState`. Built on React Aria Components: default fields for text, email, phone, URL, textarea, number, radio, select, checkboxes, boolean (checkbox, switch, yes/no), date, time and date-time; panels and plain content; paged and single navigation with progress; an error summary that receives focus and links to fields; localised interface strings (English, Simplified Chinese); replaceable field components; and an optional theme (`@formkiln/react/styles.css`) based on CSS custom properties, with dark mode.
  
  `@formkiln/core`: the form controller gains `isRequired(path)` and `isReadOnly(path)`.

### Patch Changes

- Updated dependencies [ace8590]
- Updated dependencies [8a3679b]
  - @formkiln/core@0.3.0
  - @formkiln/spec@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [9646f9d]
  - @formkiln/core@0.2.0

## 0.1.0

### Patch Changes

- Updated dependencies [0ceb86f]
  - @formkiln/core@0.1.0
