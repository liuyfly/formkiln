# @formkiln/core

Framework-agnostic engine for [Formkiln](https://github.com/liuyfly/formkiln) forms. It implements [Form Schema v1](https://github.com/liuyfly/formkiln/blob/main/packages/spec/docs/form-schema-v1.md) and passes every case of the `@formkiln/spec` conformance suite.

```bash
npm install @formkiln/core
```

## Validate a form document

```ts
import { validateDefinition } from "@formkiln/core";

const problems = validateDefinition(form); // [] when the document is valid
// [{ pointer: "/pages/0/elements/1/key", code: "duplicateKey" }]
```

Structural validation uses the JSON Schema exported by `@formkiln/spec` (`FORM_SCHEMA_V1`). `validateDefinition` checks the semantic rules of §10.

## Validate answers

```ts
import { validateAnswers } from "@formkiln/core";

const result = validateAnswers(form, answers, { now: new Date(), locale: "en" });
result.valid; // boolean
result.errors; // [{ path: "dateOfBirth", code: "expression", message: "You must be at least 18 years old." }]
result.outcome; // "standard" | null
result.submission; // active, non-null values to store
result.inactive; // paths of inactive elements
```

## Run a form session

`createFormController` holds the state of one form session for any UI framework. `@formkiln/react` is built on it.

```ts
import { createFormController } from "@formkiln/core";

const controller = createFormController(form, { initialAnswers: draft, locale: "en" });
const unsubscribe = controller.subscribe(() => render(controller.getState()));

controller.setValue("email", "ada@example.com");
controller.touch("email"); // reveal this field's errors (usually on blur)
controller.next(); // { ok: false, firstErrorPath, page } when the current page has errors
await controller.submit(async ({ submission, outcome }) => api.submit(submission));
```

`getState()` returns the answers, the full evaluation, the active pages, the current page, the errors the user should see and the submission status. Errors become visible for touched fields, for a page after `next()` and for everything after `submit()`.

## Evaluate expressions

```ts
import { evaluate, isTrue } from "@formkiln/core";

evaluate(
  { "date.diff": ["2008-11-24", { "date.today": [] }, "year"] },
  { now: "2026-11-24T12:00:00Z" },
); // 18
```

## License

Apache-2.0
