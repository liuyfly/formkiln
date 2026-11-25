---
"@formkiln/core": patch
"@formkiln/spec": patch
---

Fix rules that reference a field later in the document. Activity, calculated values and effective values shared one cycle guard, so asking for the activity of a field while computing its effective value looked like a cycle: the referencing rule saw `null` and the referenced field was left out of the submission. Each kind of computation now has its own guard. New validation conformance cases cover forward references.
