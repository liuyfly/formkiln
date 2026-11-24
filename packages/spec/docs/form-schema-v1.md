# Formkiln Form Schema — Version 1

|                         |                                                               |
| ----------------------- | ------------------------------------------------------------- |
| Status                  | **Draft**                                                     |
| Schema version          | `1`                                                           |
| Machine-readable schema | [`schema/form-v1.schema.json`](../schema/form-v1.schema.json) |
| Expression operators    | [`operators-v1.md`](operators-v1.md)                          |

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## 1. Goals

A Formkiln form is a JSON document. This specification defines:

1. the structure of a form document (pages, containers, fields, settings, outcomes);
2. the **value model**: the exact JSON encoding of every answer;
3. the **rule model**: visibility, requirement, read-only state, calculation and validation;
4. the **validation result** format shared by every implementation.

Design principles:

- **Typed values.** Every field has exactly one value type, fixed by its field type. Values are never inferred from their string shape, and implementations MUST NOT coerce a value of the wrong type (for example, MUST NOT turn a string into a date because it looks like one).
- **One semantics, many runtimes.** The browser engine (`@formkiln/core`) and the server engine (`formkiln-server`) MUST produce identical results for the same form, answers and evaluation instant. The [conformance suite](../conformance) is normative.
- **Visible failures.** Every validation failure is reported as a structured error bound to a path. Nothing fails silently.
- **Stable identifiers.** Keys identify data and never change because a label changes.

## 2. Terminology

| Term                   | Meaning                                                                                                                                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Form document**      | A JSON object conforming to this specification.                                                                                                                                                                                                                                              |
| **Element**            | An item inside a page: a container, a field or a content block.                                                                                                                                                                                                                              |
| **Field**              | An element that holds a value (an _answer_).                                                                                                                                                                                                                                                 |
| **Answers**            | A JSON object mapping field keys to values.                                                                                                                                                                                                                                                  |
| **Active / inactive**  | An element is _inactive_ when its `visible` rule, or the `visible` rule of any ancestor, does not evaluate to `true`. Otherwise it is _active_. Note that the `hidden` _field type_ is unrelated: a `hidden` field is never rendered but is active unless its `visible` rule says otherwise. |
| **Effective value**    | The value of a field as seen by rules and validation: the stored value if the field is active, otherwise `null`.                                                                                                                                                                             |
| **Expression**         | A rule written in the Formkiln expression language (JSON Logic syntax, Formkiln semantics), see [operators-v1.md](operators-v1.md).                                                                                                                                                          |
| **Evaluation instant** | The moment (`now`) used by time-dependent operators. Servers use the submission time.                                                                                                                                                                                                        |

## 3. Form document

```json
{
  "schemaVersion": 1,
  "key": "rental-application",
  "title": { "en": "Rental application" },
  "settings": { "navigation": "paged", "timeZone": "Europe/London", "defaultLocale": "en" },
  "pages": [],
  "submit": { "outcomes": [] }
}
```

| Property        | Type     | Required | Description                                               |
| --------------- | -------- | -------- | --------------------------------------------------------- |
| `schemaVersion` | `1`      | yes      | Version of this specification.                            |
| `key`           | Key      | yes      | Stable identifier of the form.                            |
| `title`         | Text     | yes      | Form title.                                               |
| `description`   | Text     | no       | Introductory text (plain text).                           |
| `settings`      | Settings | no       | See §3.1.                                                 |
| `pages`         | Page[]   | yes      | At least one page.                                        |
| `submit`        | Submit   | no       | See §8.                                                   |
| `meta`          | object   | no       | Free-form data for hosts. Implementations MUST ignore it. |

Unknown properties MUST be rejected, except inside `meta`.

### 3.1 Settings

| Property         | Type                    | Default           | Description                                                                                                                                                                                                                        |
| ---------------- | ----------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navigation`     | `"paged"` \| `"single"` | `"paged"`         | `paged` shows one page at a time; `single` renders all pages in one scroll.                                                                                                                                                        |
| `timeZone`       | IANA time zone          | `"UTC"`           | Time zone used by `date.today`.                                                                                                                                                                                                    |
| `defaultLocale`  | BCP 47 tag              | `"en"`            | Locale used when a Text has no translation for the active locale.                                                                                                                                                                  |
| `locales`        | BCP 47 tag[]            | `[defaultLocale]` | Locales the form is translated into.                                                                                                                                                                                               |
| `inactiveValues` | `"retain"` \| `"clear"` | `"retain"`        | What happens to the stored value of a field that becomes inactive. `retain` keeps it in the draft so it reappears if the field becomes active again; `clear` deletes it. In both cases inactive values are never submitted (§7.3). |

### 3.2 Keys

A **Key** matches `^[a-z][a-zA-Z0-9_]{0,63}$` (lower camelCase is recommended).

- Keys MUST be unique across the whole form document: pages, containers, fields and content blocks share one namespace. The only exception is the children of a repeater, whose keys are unique within that repeater (§5.3).
- Keys starting with `$` are reserved for the expression language.
- Keys SHOULD NOT be changed after a form has been published, because answers and integrations are bound to them.

### 3.3 Text

A **Text** is either a plain string (in the default locale) or an object mapping locales to strings:

```json
"label": { "en": "Date of birth", "zh-CN": "出生日期" }
```

When a Text is an object it MUST contain the `defaultLocale`. Texts are plain text unless stated otherwise; renderers MUST escape them and MUST NOT interpret HTML.

## 4. Pages

```json
{
  "key": "applicant",
  "title": "About you",
  "visible": true,
  "elements": []
}
```

| Property      | Type      | Required | Description                                                    |
| ------------- | --------- | -------- | -------------------------------------------------------------- |
| `key`         | Key       | yes      |                                                                |
| `title`       | Text      | no       |                                                                |
| `description` | Text      | no       |                                                                |
| `visible`     | Condition | no       | Default `true`. An inactive page is skipped during navigation. |
| `elements`    | Element[] | yes      | May be empty.                                                  |

## 5. Elements

Every element has a `type` and a `key`. Common optional properties:

| Property  | Type      | Description                                      |
| --------- | --------- | ------------------------------------------------ |
| `visible` | Condition | Default `true`. See §7.1.                        |
| `meta`    | object    | Free-form host data, ignored by implementations. |

### 5.1 Content

Static text that holds no value.

```json
{
  "type": "content",
  "key": "intro",
  "text": "Please have your **bank details** ready.",
  "format": "markdown"
}
```

| Property | Type                      | Required | Description                                                                                                                                                                                                    |
| -------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`   | Text                      | yes      |                                                                                                                                                                                                                |
| `format` | `"plain"` \| `"markdown"` | no       | Default `plain`. The markdown subset is: paragraphs, line breaks, emphasis, strong emphasis, bulleted and numbered lists, and links with `http`, `https` or `mailto` URLs. Renderers MUST NOT render raw HTML. |

### 5.2 Panel

Groups elements for layout and shared visibility. A panel does **not** create a namespace: the keys of its fields are top-level answer keys.

```json
{
  "type": "panel",
  "key": "employment",
  "title": "Employment",
  "visible": { "==": [{ "var": "employmentStatus" }, "employed"] },
  "elements": []
}
```

| Property      | Type      | Required |
| ------------- | --------- | -------- |
| `title`       | Text      | no       |
| `description` | Text      | no       |
| `elements`    | Element[] | yes      |

### 5.3 Repeater

Collects a list of items, each with the same child elements (for example, previous addresses).

```json
{
  "type": "repeater",
  "key": "previousAddresses",
  "label": "Previous addresses",
  "minItems": 0,
  "maxItems": 5,
  "itemLabel": "Address",
  "elements": [
    { "type": "address", "key": "address", "label": "Address", "required": true },
    { "type": "date", "key": "movedIn", "label": "Moved in", "required": true }
  ]
}
```

| Property      | Type        | Required | Description                                                     |
| ------------- | ----------- | -------- | --------------------------------------------------------------- |
| `label`       | Text        | yes      |                                                                 |
| `description` | Text        | no       |                                                                 |
| `itemLabel`   | Text        | no       | Label of one item, used for "Add" buttons and headings.         |
| `minItems`    | integer ≥ 0 | no       | Default `0`.                                                    |
| `maxItems`    | integer ≥ 1 | no       | No limit if absent.                                             |
| `elements`    | Element[]   | yes      | Fields, panels and content. Repeaters MUST NOT be nested in v1. |

The value of a repeater is an array of **item objects**. Each item object maps the keys of the repeater's descendant fields to their values. Child keys are unique within the repeater and MAY reuse keys used outside it.

Inside a repeater, rules reference the current item with `$item` (for example `{"var": "$item.movedIn"}`) and its zero-based position with `$index` (see [operators-v1.md §2](operators-v1.md#2-data-access)).

### 5.4 Fields

All fields share these properties:

| Property          | Type        | Required | Description                                                                                                                                         |
| ----------------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`           | Text        | yes      | Always required for accessibility.                                                                                                                  |
| `hideLabel`       | boolean     | no       | Visually hide the label (it stays available to assistive technology).                                                                               |
| `description`     | Text        | no       | Help text shown with the field.                                                                                                                     |
| `placeholder`     | Text        | no       | For text-like fields only.                                                                                                                          |
| `required`        | Condition   | no       | Default `false`. See §7.2.                                                                                                                          |
| `requiredMessage` | Text        | no       | Overrides the default `required` error message.                                                                                                     |
| `readOnly`        | Condition   | no       | Default `false`. A presentation hint: the value cannot be edited in the UI but is still submitted. Servers MUST NOT treat it as a security control. |
| `defaultValue`    | Value       | no       | Initial value. MUST match the field's value type.                                                                                                   |
| `calculate`       | Expression  | no       | Makes the field calculated (§7.4).                                                                                                                  |
| `validators`      | Validator[] | no       | See §9.                                                                                                                                             |
| `sensitive`       | boolean     | no       | Marks personal or secret data. Servers SHOULD encrypt it at rest and mask it in administrative views; implementations MUST NOT log it.              |
| `autocomplete`    | string      | no       | HTML `autocomplete` token hint (for example `given-name`).                                                                                          |

## 6. Field types and the value model

### 6.1 Value types

| Value type | JSON encoding                                              | Example                  |
| ---------- | ---------------------------------------------------------- | ------------------------ |
| `string`   | string                                                     | `"Jane"`                 |
| `number`   | number (finite, IEEE 754 double)                           | `1250.5`                 |
| `boolean`  | `true` / `false`                                           | `true`                   |
| `date`     | string `YYYY-MM-DD` (calendar date, no time, no time zone) | `"1990-04-21"`           |
| `time`     | string `HH:mm` or `HH:mm:ss`, 24-hour, no time zone        | `"09:30"`                |
| `datetime` | string, RFC 3339 date-time **with** offset                 | `"2026-11-24T09:30:00Z"` |
| `string[]` | array of unique strings                                    | `["pets", "smoker"]`     |
| `file[]`   | array of File references                                   | see §6.4                 |
| `name`     | Name object                                                | see §6.3                 |
| `address`  | Address object                                             | see §6.3                 |
| `item[]`   | array of item objects (repeaters)                          | see §5.3                 |

A `date` value MUST be a valid calendar date (`2026-02-30` is invalid). A `datetime` value MUST NOT be accepted where a `date` is expected, and vice versa.

### 6.2 Field types

| `type`       | Value type              | Type-specific properties                                                                                                             |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `text`       | `string`                | `maxLength` hint is expressed with validators                                                                                        |
| `textarea`   | `string`                | `rows` (integer, display hint)                                                                                                       |
| `email`      | `string`                | Built-in format check `format.email`                                                                                                 |
| `phone`      | `string`                | Built-in format check `format.phone`                                                                                                 |
| `url`        | `string`                | Built-in format check `format.url` (absolute `http`/`https` URL)                                                                     |
| `number`     | `number`                | `prefix`, `suffix` (Text, display only), `step` (number, display hint)                                                               |
| `radio`      | `string`                | `options` (required)                                                                                                                 |
| `select`     | `string`                | `options` (required)                                                                                                                 |
| `checkboxes` | `string[]`              | `options` (required)                                                                                                                 |
| `boolean`    | `boolean`               | `display`: `"checkbox"` (default) \| `"switch"` \| `"yesNo"`                                                                         |
| `date`       | `date`                  | —                                                                                                                                    |
| `time`       | `time`                  | —                                                                                                                                    |
| `datetime`   | `datetime`              | —                                                                                                                                    |
| `file`       | `file[]`                | `multiple` (boolean, default `false`), `accept` (array of MIME types or extensions such as `".pdf"`)                                 |
| `name`       | `name`                  | `parts`, `requiredParts` (§6.3)                                                                                                      |
| `address`    | `address`               | `parts`, `requiredParts` (§6.3)                                                                                                      |
| `hidden`     | declared by `valueType` | `valueType` (required): any value type except `item[]`. Never rendered. Its value comes from `defaultValue`, prefill or `calculate`. |

**Options.** `options` is a non-empty array of `{ "value": string, "label": Text }`. Option values MUST be unique within the field and SHOULD be stable identifiers, not display text. A value that is not one of the options is invalid (`option` error). The order of a `checkboxes` value is not significant; implementations SHOULD store it in option order.

**Built-in format checks** (portable regular expressions, see [operators-v1.md §7](operators-v1.md#7-strings)):

| Check          | Rule                                              |
| -------------- | ------------------------------------------------- |
| `format.email` | `^[^\s@]+@[^\s@]+\.[^\s@]+$`                      |
| `format.phone` | `^\+?[0-9 ()\-]{6,20}$`                           |
| `format.url`   | an absolute URL whose scheme is `http` or `https` |

### 6.3 Composite values

**Name** — object with optional string members `title`, `given`, `middle`, `family`.

**Address** — object with optional string members `line1`, `line2`, `city`, `region`, `postalCode`, `country` (ISO 3166-1 alpha-2, upper case).

| Property        | Default for `name`    | Default for `address`                                 | Description                                                                           |
| --------------- | --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `parts`         | `["given", "family"]` | `["line1", "line2", "city", "postalCode", "country"]` | Members shown, in order.                                                              |
| `requiredParts` | `["given", "family"]` | `["line1", "city", "postalCode"]`                     | Members that must be filled when the value is not empty. MUST be a subset of `parts`. |

A composite value MUST NOT contain members outside `parts`. If any member is filled, every member in `requiredParts` MUST be filled (`required` error with the member path, for example `address.city`). If the field is `required`, the value MUST NOT be empty.

### 6.4 File references

A file value is an array of objects returned by the server's upload API:

```json
{ "id": "f_01JD8X…", "name": "payslip.pdf", "size": 182044, "contentType": "application/pdf" }
```

Form documents never contain file contents. If `multiple` is `false`, the array MUST NOT have more than one element.

### 6.5 Empty values

The canonical empty value is `null`. Implementations MUST normalise `""`, `[]`, `{}` and composite objects whose members are all empty to `null` before evaluating rules, validating or submitting. Strings are otherwise stored exactly as entered (no implicit trimming).

### 6.6 Initial values and prefill

The initial value of a field is, in order of precedence: the draft value, the prefill value supplied by the host, the `defaultValue`, then `null`.

Prefill and draft values MUST match the field's value type. A value that does not match MUST be rejected and reported to the host (for example through an `onPrefillError` callback). It MUST NOT be coerced.

## 7. Rules

Rules are evaluated against the **effective values** of all fields (§2).

A **Condition** is either a boolean literal or an Expression. A condition holds **only** when it evaluates to `true`. Any other result (`false`, `null`, a number, …) means it does not hold.

### 7.1 Visibility

- An element is inactive when its own `visible` condition does not hold or any ancestor (panel, repeater, page) is inactive.
- The effective value of every field in an inactive element is `null`.
- Inactive fields are not validated and their values are not submitted.

### 7.2 Requirement

A field whose `required` condition holds MUST have a non-empty value; otherwise the `required` error is reported. Requirement is evaluated only for active fields. For a `boolean` field, `false` is a value (not empty); use an `equals` validator to demand `true` (for example consent checkboxes).

### 7.3 Submission data

The submitted answers contain the values of **active** fields only (including active `hidden` and calculated fields). Inactive values are omitted, whatever `inactiveValues` says. Servers MUST recompute visibility, calculated values and validation from the submitted answers and MUST NOT trust any client-computed state.

### 7.4 Calculated fields

A field with `calculate` is calculated:

- its value is the result of the expression, recomputed whenever a dependency changes;
- it is always read-only in the UI;
- if the result does not match the field's value type, the value is `null` and a `type` error is reported;
- servers MUST recompute it and replace any client-supplied value.

### 7.5 Dependencies and cycles

Each rule depends on the fields it references, and each field's effective value depends on the `visible` conditions of the field and its ancestors. These dependencies form a graph that MUST be acyclic. A form document with a cycle is invalid (§10).

### 7.6 Evaluation instant

`date.today` depends on the evaluation instant and `settings.timeZone`. Browsers use the current time; servers use the time the submission was received. Conformance cases fix `now` explicitly.

## 8. Submit outcomes

After a successful validation, `submit.outcomes` decides what happens next. Outcomes are evaluated in order and the first whose `when` condition holds is selected. An outcome without `when` always matches and SHOULD be last.

```json
"submit": {
  "outcomes": [
    { "key": "needsGuarantor", "when": { "==": [{ "var": "hasGuarantor" }, "yes"] }, "message": "We will contact your guarantor." },
    { "key": "standard", "message": "Thank you. Your application has been received." }
  ]
}
```

| Property   | Type      | Required | Description                                                                                             |
| ---------- | --------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `key`      | Key       | yes      | Reported to the host (for example `onSubmitted({ outcome: "needsGuarantor" })`). Unique among outcomes. |
| `when`     | Condition | no       |                                                                                                         |
| `message`  | Text      | no       | Shown after submission.                                                                                 |
| `redirect` | string    | no       | Absolute `https` URL or a path starting with `/`. Hosts MAY override the navigation.                    |

If no outcome matches, the outcome is `null` and the host decides what to do. The server computes the outcome independently and returns it with the submission result.

## 9. Validators

Validators run only on **active** fields with a **non-empty** effective value (emptiness is handled by `required`). Each validator MAY define a `message` (Text) that replaces the default message.

| `type`        | Applies to                     | Parameters                                                             | Error code    |
| ------------- | ------------------------------ | ---------------------------------------------------------------------- | ------------- |
| `minLength`   | `string`                       | `value`: integer ≥ 0                                                   | `minLength`   |
| `maxLength`   | `string`                       | `value`: integer ≥ 0                                                   | `maxLength`   |
| `pattern`     | `string`                       | `value`: portable regex (full match)                                   | `pattern`     |
| `min`         | `number`                       | `value`: number                                                        | `min`         |
| `max`         | `number`                       | `value`: number                                                        | `max`         |
| `integer`     | `number`                       | —                                                                      | `integer`     |
| `minDate`     | `date`                         | `value`: date literal or Expression returning a date                   | `minDate`     |
| `maxDate`     | `date`                         | `value`: date literal or Expression returning a date                   | `maxDate`     |
| `minItems`    | `string[]`, `file[]`, `item[]` | `value`: integer ≥ 0                                                   | `minItems`    |
| `maxItems`    | `string[]`, `file[]`, `item[]` | `value`: integer ≥ 1                                                   | `maxItems`    |
| `maxFileSize` | `file[]`                       | `value`: bytes, integer ≥ 1 (per file)                                 | `maxFileSize` |
| `fileTypes`   | `file[]`                       | `value`: MIME types or extensions                                      | `fileType`    |
| `equals`      | any                            | `value`: Value                                                         | `equals`      |
| `expression`  | any                            | `rule`: Expression that must evaluate to `true`; `message` is required | `expression`  |

String lengths are counted in Unicode code points. Inside an `expression` validator, `{"var": "$value"}` refers to the field's own effective value.

Repeater-level `minItems`/`maxItems` are declared on the repeater itself (§5.3) and use the same error codes.

## 10. Static validity

A form document is valid only if it conforms to the [JSON Schema](../schema/form-v1.schema.json) **and** satisfies these rules, which a JSON Schema cannot express:

1. Keys are unique as described in §3.2; outcome keys are unique among outcomes.
2. Every `var` path references an existing field key, `$item`/`$index` inside a repeater, `$value` inside an `expression` validator, or `$this`/`$thisIndex` inside an array operator.
3. Every operator is defined in [operators-v1.md](operators-v1.md), with the documented number of arguments.
4. The dependency graph (§7.5) is acyclic.
5. `defaultValue` and `equals` values match the field's value type; option values are unique; `requiredParts` ⊆ `parts`.
6. Validators are applied only to the value types listed in §9.
7. Repeaters are not nested.

Implementations MUST refuse to publish or render an invalid form document and MUST report every problem found, each with a JSON Pointer to the offending location.

## 11. Validation results

Validating answers against a form produces a list of errors:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "dateOfBirth",
      "code": "expression",
      "message": "You must be at least 18 years old."
    },
    { "path": "previousAddresses.0.address.city", "code": "required" }
  ]
}
```

| Property  | Type   | Description                                                                                                                       |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `path`    | string | Dot path to the value: field key, then repeater index and child key, then composite member.                                       |
| `code`    | string | One of the codes in §6.2 and §9, `required`, `type` or `option`.                                                                  |
| `message` | string | Optional. The resolved custom message, if the form defines one. Renderers otherwise use their own localised default for the code. |
| `params`  | object | Optional parameters for message templates (for example `{ "value": 8 }` for `minLength`).                                         |

Errors are ordered by the position of the field in the document (page, then element order, then repeater index). A value that does not match its value type produces a single `type` error and no further errors for that path.

Renderers MUST display every error next to its field and, on submit, MUST navigate to the page of the first error and move focus to that field.

## 12. Versioning

- `schemaVersion` identifies this specification. Backwards-incompatible changes increase it, and `@formkiln/core` ships a migrator from every earlier version.
- Versions of a particular form (drafts, published versions) are managed by the platform, not inside the document. A published form version is immutable, and every submission records the version it was made with.
