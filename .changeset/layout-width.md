---
"@formkiln/spec": minor
"@formkiln/core": minor
---

Layout grid: `settings.layout.columns` (1 to 12, default 3) and an optional `width` on every element, the number of columns it spans (Form Schema §5.5). Elements are placed in document order and share a row while they fit. The layout is presentational only. A new static-validity code, `width`, reports a width wider than the grid. `@formkiln/react` does not apply the layout yet (every element stays full width). Versions of `@formkiln/core` and `@formkiln/react` before this release reject documents that use `layout` or `width`: upgrade every embedding application before publishing such forms.
