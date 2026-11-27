# @formkiln/react

## 0.6.0

### Patch Changes

- Updated dependencies [7c04a94]
  - @formkiln/spec@0.6.0
  - @formkiln/core@0.6.0

## 0.5.0

### Minor Changes

- 4c1d336: Renders the layout grid of Form Schema §5.5: forms that set a `width` on any element lay out pages, panels and repeater items on a grid of `settings.layout.columns` columns, in document order. Inactive elements and hidden fields take no space. Below 36rem of viewport width (or of a host element declared as `container: fk / inline-size`) every element takes a full row. Forms without widths render exactly as before.

### Patch Changes

- b759a55: Clicking a button (Submit, Continue) while a field with an invalid answer has focus no longer loses the click: the field's error now appears once the press is released, instead of shifting the button away under the pointer.
- Updated dependencies [d66058c]
  - @formkiln/spec@0.5.0
  - @formkiln/core@0.5.0

## 0.4.0

### Minor Changes

- 633ce74: Add a `beforeSubmit` slot, rendered above the submit button on the last page (for example a human verification widget), and `SubmitError`: throw it from `onSubmit` to show its message instead of the generic failure message.

### Patch Changes

- 0d434e7: Name and address fields count as visited only when focus leaves the whole field, so filling in Title no longer reveals "required" errors for First name and Last name before the user reaches them.
- 4f83421: Item-count errors use messages specific to the element: repeaters name the add button ("Add at least 1 using “Add Previous address”", "You can add up to 2. Remove the extra ones."), checkboxes and files say "Select at least 2 options" and "Upload no more than 3 files", with plural forms through `Intl.PluralRules`. New `counts` messages (English and Simplified Chinese) and an optional context argument for `errorText`.
- 0caf362: Date picker: month and year dropdowns in the calendar header (101 years around the shown year) to reach distant dates quickly; a compact popover aligned to the end of the input instead of stretching to its width; clearer today, hover, selected, pressed and unavailable day styles.
- a50a0b5: Fix: a composite field with an error in one part no longer shows its other, valid parts with a red border (the invalid style now uses child combinators). The error summary labels member errors precisely, for example "Full name – Last name" or "Documents – big.pdf", instead of repeating the field label.
- b4c5d35: Pages without a title no longer repeat the form title as their heading (the host page shows the form title), and their section no longer points `aria-labelledby` at a missing element. After a page change, focus moves to the page heading or, without one, to the page itself.
- Updated dependencies [1c0c373]
  - @formkiln/core@0.4.0
  - @formkiln/spec@0.4.0

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
