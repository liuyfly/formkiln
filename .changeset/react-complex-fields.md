---
"@formkiln/react": minor
---

Support every Form Schema v1 element: name and address fields (one labelled input per part, member errors next to inputs), repeaters (item cards, add and remove, `$index`-driven visibility, focus on the new item), file uploads through a host `uploadFile` callback (upload status, per-file errors, removal), and a safe Markdown subset for content. Field components receive `fieldErrorMessages` and `errorsAt(member)`. Accessibility is checked with axe-core on every page of the example form.
