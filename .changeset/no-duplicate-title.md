---
"@formkiln/react": patch
---

Pages without a title no longer repeat the form title as their heading (the host page shows the form title), and their section no longer points `aria-labelledby` at a missing element. After a page change, focus moves to the page heading or, without one, to the page itself.
