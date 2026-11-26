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

| Property         | Type                    | Default            | Description                                                                                                                                                                                                                        |
| ---------------- | ----------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navigation`     | `"paged"` \| `"single"` | `"paged"`          | `paged` shows one page at a time; `single` renders all pages in one scroll.                                                                                                                                                        |
| `timeZone`       | IANA time zone          | `"UTC"`            | Time zone used by `date.today`.                                                                                                                                                                                                    |
| `defaultLocale`  | BCP 47 tag              | `"en"`             | Locale used when a Text has no translation for the active locale.                                                                                                                                                                  |
| `locales`        | BCP 47 tag[]            | `[defaultLocale]`  | Locales the form is translated into.                                                                                                                                                                                               |
| `inactiveValues` | `"retain"` \| `"clear"` | `"retain"`         | What happens to the stored value of a field that becomes inactive. `retain` keeps it in the draft so it reappears if the field becomes active again; `clear` deletes it. In both cases inactive values are never submitted (§7.3). |
| `layout`         | Layout                  | `{ "columns": 3 }` | The layout grid; see §5.5.                                                                                                                                                                                                         |

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
| `id`      | string    | Stable identifier of the element. See §5.6.      |
| `visible` | Condition | Default `true`. See §7.1.                        |
| `width`   | integer   | Columns the element spans. See §5.5.             |
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

The value of a repeater is an array of **item objects**. Each item object maps the keys of the repeater's descendant fields to their values. Child keys are unique within the repeater and MAY reuse keys used outside it. The effective value of a repeater, as seen by rules, is the array of its items, where each item holds the effective values of its children.

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

### 5.5 Layout

Elements are laid out on a grid of equal columns. `settings.layout.columns` sets the number of columns, from 1 to 12, default 3. An element's `width` is the number of columns it spans, from 1 to `columns`; it defaults to `columns`, the full width.

```json
{
  "settings": { "layout": { "columns": 3 } },
  "pages": [
    {
      "key": "contact",
      "elements": [
        { "type": "text", "key": "givenName", "label": "First name", "width": 1 },
        { "type": "text", "key": "familyName", "label": "Last name", "width": 2 },
        { "type": "email", "key": "email", "label": "Email" }
      ]
    }
  ]
}
```

Here the two names share the first row and the email field takes the second.

Placement:

1. The elements of a page, of a panel and of each repeater item form one sequence, in document order. A panel's elements are placed on a grid of the same number of columns inside the panel's own width; a repeater item's elements likewise inside the repeater.
2. An element is placed on the current row if its width fits in the columns left on that row; otherwise it starts a new row. Earlier rows are never back-filled, so the visual order is always the document order.
3. Elements that are not visible (§7.1) and `hidden` fields take no space; the elements after them move up.

The layout is presentational only. It MUST NOT affect validation, submission data or the order in which errors are reported. Renderers SHOULD keep the reading and focus order equal to the document order, and MAY place every element on its own row when the available width is too small for the grid (for example on a phone), which is what WCAG 2.1 success criterion 1.4.10 (reflow) asks for.

### 5.6 Element ids

An element MAY have an `id`: 1 to 64 letters, digits, `_` or `-`, unique among all elements of the document (at any depth). The `key` names the answer and can be changed (a rename); the `id` identifies the element itself and is kept for its whole life, through renames, moves and later versions of the form.

```json
{ "type": "text", "id": "k3x9q2", "key": "legalName", "label": "Company legal name" }
```

- Authoring tools SHOULD give every new element a random `id`, keep it when the element is edited or moved, and give a copy of an element a new one. An `id` is never reused for another element.
- The `id` is not part of answers or submission data, and renderers ignore it.
- Platforms MAY use it to follow an element between versions: an element with the same `id` and a different `key` in a later version is the same field renamed, not a field removed and another one added (for example to keep the answers of both versions in one export column).

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

**Built-in format checks** use the [portable regular expressions](operators-v1.md#71-portable-regular-expressions) below, always as full matches:

| Check          | Pattern                           |
| -------------- | --------------------------------- |
| `format.email` | `[^\s@]+@[^\s@]+\.[^\s@]+`        |
| `format.phone` | `\+?[0-9 ()\-]{6,20}`             |
| `format.url`   | `https?://[^\s/?#]+(?:[/?#]\S*)?` |

### 6.3 Composite values

**Name** — object with optional string members `title`, `given`, `middle`, `family`.

**Address** — object with optional string members `line1`, `line2`, `city`, `region`, `postalCode`, `country`. `country` SHOULD be an ISO 3166-1 alpha-2 code in upper case; v1 does not validate it.

| Property        | Default for `name`    | Default for `address`                                 | Description                                                                           |
| --------------- | --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `parts`         | `["given", "family"]` | `["line1", "line2", "city", "postalCode", "country"]` | Members shown, in order.                                                              |
| `requiredParts` | `["given", "family"]` | `["line1", "city", "postalCode"]`                     | Members that must be filled when the value is not empty. MUST be a subset of `parts`. |

If any member is filled, every member in `requiredParts` MUST be filled. Each missing member is reported as a `required` error with the member path (for example `currentAddress.city`), in `parts` order. If the field is `required`, the value MUST NOT be empty.

### 6.4 File references

A file value is an array of objects returned by the server's upload API:

```json
{ "id": "f_01JD8X…", "name": "payslip.pdf", "size": 182044, "contentType": "application/pdf" }
```

`id`, `name` and `contentType` are non-empty strings and `size` is an integer ≥ 0; no other members are allowed. Form documents never contain file contents. If `multiple` is `false`, the array MUST NOT have more than one element (`maxItems` error with `{ "value": 1 }`).

### 6.5 Empty values

The canonical empty value is `null`. Before evaluating rules, validating or submitting, implementations MUST normalise answers as follows:

- `""`, `[]` and `{}` become `null`;
- in a `name` or `address` value, members equal to `""` or `null` are removed; if no member remains, the value becomes `null`;
- inside repeater items, each child value is normalised individually. An item object itself is never turned into `null`, but a repeater value of `[]` becomes `null`.

Strings are otherwise kept exactly as entered: there is no implicit trimming.

### 6.6 Initial values and prefill

The initial value of a field is, in order of precedence: the draft value, the prefill value supplied by the host, the `defaultValue`, then `null`. Initial values are applied by renderers; servers validate submitted answers as they are and never insert defaults.

Prefill and draft values MUST match the field's value type. A value that does not match MUST be rejected and reported to the host (for example through an `onPrefillError` callback). It MUST NOT be coerced.

### 6.7 Type checking

After normalisation, every non-null value is checked against its field's value type:

| Value type        | Valid when                                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`          | a string                                                                                                                                                                                                             |
| `number`          | a finite JSON number                                                                                                                                                                                                 |
| `boolean`         | `true` or `false`                                                                                                                                                                                                    |
| `date`            | a valid calendar date `YYYY-MM-DD` between `0001-01-01` and `9999-12-31`                                                                                                                                             |
| `time`            | `HH:mm` or `HH:mm:ss` with `HH` 00–23 and `mm`/`ss` 00–59                                                                                                                                                            |
| `datetime`        | `YYYY-MM-DDTHH:mm:ss`, optionally with 1–9 fractional digits, followed by `Z` or `±HH:mm`. The date must be valid, the time ranges are as for `time` and the offset is at most `±23:59`. `T` and `Z` are upper case. |
| `string[]`        | an array of unique strings                                                                                                                                                                                           |
| `file[]`          | an array of valid file references (§6.4)                                                                                                                                                                             |
| `name`, `address` | an object whose members are strings and are listed in `parts`                                                                                                                                                        |
| `item[]`          | an array of objects                                                                                                                                                                                                  |

A value of the wrong type produces exactly one `type` error for that path, if the field is active. For every other purpose it is treated as `null`. Inside repeater items, unknown child keys are ignored.

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

The **submission** is the object that is stored. It contains the key and effective value of every active field whose effective value is not `null`, including active `hidden` and calculated fields. A repeater contributes an array of item objects built the same way from its children. Inactive values are always omitted, whatever `inactiveValues` says. Answers for keys that are not fields of the form, and client-supplied values of calculated fields, are ignored.

Servers MUST recompute visibility, calculated values and validation from the submitted answers and MUST NOT trust any client-computed state.

### 7.4 Calculated fields

A field with `calculate` is calculated:

- its value is the result of the expression, recomputed whenever a dependency changes;
- it is always read-only in the UI;
- if the result does not match the field's value type, the value is `null` and a `type` error is reported;
- servers MUST recompute it and replace any client-supplied value.

The expression is evaluated even when the field is inactive (rules never see the result then, because the effective value is `null`).

### 7.5 Dependencies and cycles

The value of an element depends on:

- the fields referenced by its `calculate` expression;
- the fields referenced by its own `visible` condition and by the `visible` conditions of its ancestors.

Inside a repeater, `$item.<child>` refers to the child of the same item. These dependencies form a graph that MUST be acyclic, and a form document with a cycle is invalid (§10). `required`, `readOnly`, validators and outcomes only consume values, so they cannot create cycles.

### 7.6 Evaluation instant

`date.today` depends on the evaluation instant and `settings.timeZone`. Browsers use the current time; servers use the time the submission was received. Conformance cases fix `now` explicitly.

## 8. Submit outcomes

When validation finds no errors, `submit.outcomes` decides what happens next. Outcomes are evaluated in order and the first whose `when` condition holds is selected. An outcome without `when` always matches and SHOULD be last.

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

If validation reports errors, or no outcome matches, the outcome is `null`. The server computes the outcome independently and returns it with the submission result.

## 9. Validators

Validators run only on **active** fields with a **non-empty**, correctly typed effective value (emptiness is handled by `required`). Each validator MAY define a `message` (Text) that replaces the default message.

| `type`        | Applies to           | Parameters                                                           | Fails when                                        | Error code    |
| ------------- | -------------------- | -------------------------------------------------------------------- | ------------------------------------------------- | ------------- |
| `minLength`   | `string`             | `value`: integer ≥ 0                                                 | fewer code points than `value`                    | `minLength`   |
| `maxLength`   | `string`             | `value`: integer ≥ 0                                                 | more code points than `value`                     | `maxLength`   |
| `pattern`     | `string`             | `value`: portable regex                                              | the whole string does not match                   | `pattern`     |
| `min`         | `number`             | `value`: number                                                      | the number is less than `value`                   | `min`         |
| `max`         | `number`             | `value`: number                                                      | the number is greater than `value`                | `max`         |
| `integer`     | `number`             | —                                                                    | the number has a fractional part                  | `integer`     |
| `minDate`     | `date`               | `value`: date literal or Expression returning a date                 | the date is before `value`                        | `minDate`     |
| `maxDate`     | `date`               | `value`: date literal or Expression returning a date                 | the date is after `value`                         | `maxDate`     |
| `minItems`    | `string[]`, `file[]` | `value`: integer ≥ 0                                                 | fewer elements than `value`                       | `minItems`    |
| `maxItems`    | `string[]`, `file[]` | `value`: integer ≥ 1                                                 | more elements than `value`                        | `maxItems`    |
| `maxFileSize` | `file[]`             | `value`: bytes, integer ≥ 1                                          | a file is larger than `value` (reported per file) | `maxFileSize` |
| `fileTypes`   | `file[]`             | `value`: MIME types, `type/*` wildcards or extensions such as `.pdf` | a file matches no entry (reported per file)       | `fileType`    |
| `equals`      | any                  | `value`: Value                                                       | the value is not `==` to `value`                  | `equals`      |
| `expression`  | any                  | `rule`: Expression; `message` is required                            | the rule does not evaluate to `true`              | `expression`  |

- Inside an `expression` validator, `{"var": "$value"}` refers to the field's own effective value. Inside a repeater, `$item` and `$index` also refer to the current item.
- If a `minDate`/`maxDate` expression does not evaluate to a valid date, the validator is skipped.
- `fileTypes` compares MIME types case-insensitively (`image/*` matches any `image/` type), and extensions case-insensitively against the end of the file `name`.
- Per-file errors use the path of the file (for example `payslips.1`).
- A repeater's own `minItems`/`maxItems` (§5.3) are checked whenever the repeater is active, **including when it is empty**, and are reported at the repeater path with the same codes.

## 10. Static validity

A form document is valid only if it conforms to the [JSON Schema](../schema/form-v1.schema.json) **and** satisfies these rules, which a JSON Schema cannot express:

| Code                  | Rule                                                                                                                                                                                                                                       | Pointer                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `duplicateKey`        | Keys are unique as described in §3.2.                                                                                                                                                                                                      | the `key` of every occurrence after the first             |
| `duplicateOutcomeKey` | Outcome keys are unique.                                                                                                                                                                                                                   | the `key` of every occurrence after the first             |
| `varPath`             | The path argument of every `var` is a string literal.                                                                                                                                                                                      | the `var` operation                                       |
| `unknownReference`    | Every `var` path starts with a field or repeater key defined outside any repeater, `$item`/`$index` inside a repeater, `$value` inside an `expression` validator, or `$this`/`$thisIndex` inside the second argument of an array operator. | the `var` operation                                       |
| `arity`               | Every operator has an allowed number of arguments ([operators-v1.md §10](operators-v1.md#10-arity)).                                                                                                                                       | the operation                                             |
| `invalidPattern`      | Every `pattern` validator value and every literal `matches` pattern is a valid portable regular expression.                                                                                                                                | the pattern string                                        |
| `cycle`               | The dependency graph (§7.5) is acyclic. Reported once per cycle.                                                                                                                                                                           | the field in the cycle that appears first in the document |
| `valueType`           | `defaultValue` and `equals` values match the field's value type (§6.7).                                                                                                                                                                    | the offending value                                       |
| `duplicateOption`     | Option values are unique within a field.                                                                                                                                                                                                   | the `value` of every occurrence after the first           |
| `requiredParts`       | `requiredParts` ⊆ `parts`.                                                                                                                                                                                                                 | `requiredParts`                                           |
| `validatorType`       | Validators are applied only to the value types listed in §9.                                                                                                                                                                               | the validator                                             |
| `width`               | Every `width` is at most `settings.layout.columns` (default 3).                                                                                                                                                                            | `width`                                                   |
| `duplicateId`         | Element ids are unique in the document (§5.6).                                                                                                                                                                                             | the `id` of every occurrence after the first              |

Each error is reported as `{ "pointer": "<JSON Pointer>", "code": "<code>" }`, where the pointer ([RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)) locates the offending value. For example, the `/` operator is escaped as `~1`. Errors are compared as an unordered set.

Implementations MUST refuse to publish or render an invalid form document and MUST report every problem found.

## 11. Validating answers

### 11.1 Procedure

Given a valid form document, answers, an evaluation instant and optionally a locale:

1. Normalise the answers (§6.5) and type-check them (§6.7).
2. Compute calculated values (§7.4), then visibility and effective values, in dependency order (§7.5).
3. Validate every active field (§7.2, §6.3, §6.4, §9) and every active repeater, in document order.
4. If there are no errors, select the outcome (§8).
5. Build the submission (§7.3).

### 11.2 Result

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
  ],
  "outcome": null
}
```

| Property  | Type   | Description                                                                                                                                                                                                                                |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`    | string | Dot path to the value: field key, then repeater index and child key, then composite member or file index.                                                                                                                                  |
| `code`    | string | `required`, `type`, `option`, a `format.*` code (§6.2) or a validator code (§9).                                                                                                                                                           |
| `message` | string | Present only when the form defines a custom message (`requiredMessage`, or a validator `message`), resolved for the requested locale with a fallback to `defaultLocale`. Renderers otherwise use their own localised default for the code. |
| `params`  | object | For validator codes, `{ "value": … }` holding the validator's value (the evaluated date for `minDate`/`maxDate`). Absent for other codes.                                                                                                  |

### 11.3 Error order and precedence

- Errors are ordered by the position of the field in the document (pages, then elements depth-first). A repeater's own errors come first, then its items in index order, each in element order.
- For one field, at most one of these is reported, in this priority: `type`, then `required`.
- Otherwise, a composite field reports its missing members (§6.3); a choice field reports `option` when a value (or an element of a `checkboxes` value) is not an option; a `format.*` check is reported; and then every failing validator is reported in declaration order. Per-file errors follow file index order within their validator.

Renderers MUST display every error next to its field and, on submit, MUST navigate to the page of the first error and move focus to that field.

## 12. Versioning

- `schemaVersion` identifies this specification. Backwards-incompatible changes increase it, and `@formkiln/core` ships a migrator from every earlier version.
- Versions of a particular form (drafts, published versions) are managed by the platform, not inside the document. A published form version is immutable, and every submission records the version it was made with.
