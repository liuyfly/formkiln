---
"@formkiln/core": minor
"@formkiln/spec": patch
---

Add the expression evaluator (`evaluate`, `isTrue`) and portable regular expression compiler (`compilePortableRegex`) to `@formkiln/core`. The evaluator passes every expression conformance case. The operator specification now defines the portable regex subset precisely, and non-array arguments to array operators behave like `null`.
