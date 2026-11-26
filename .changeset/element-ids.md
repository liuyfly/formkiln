---
"@formkiln/spec": minor
"@formkiln/core": minor
---

Element ids (Form Schema §5.6): an optional `id` on every element, a stable identifier that stays with the element through key renames, moves and later versions. It is never part of answers. A new static-validity code, `duplicateId`, reports an id used by more than one element. Renderers ignore ids.
