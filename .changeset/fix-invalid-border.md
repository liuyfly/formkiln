---
"@formkiln/react": patch
---

Fix: a composite field with an error in one part no longer shows its other, valid parts with a red border (the invalid style now uses child combinators). The error summary labels member errors precisely, for example "Full name – Last name" or "Documents – big.pdf", instead of repeating the field label.
