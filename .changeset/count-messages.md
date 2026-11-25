---
"@formkiln/react": patch
---

Item-count errors use messages specific to the element: repeaters name the add button ("Add at least 1 using “Add Previous address”", "You can add up to 2. Remove the extra ones."), checkboxes and files say "Select at least 2 options" and "Upload no more than 3 files", with plural forms through `Intl.PluralRules`. New `counts` messages (English and Simplified Chinese) and an optional context argument for `errorText`.
