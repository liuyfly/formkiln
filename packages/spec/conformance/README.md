# Conformance suite

Language-neutral test cases that define the behaviour of Formkiln engines. The TypeScript engine (`@formkiln/core`) and the Java engine (`formkiln-server`) MUST pass every case. When the specification and a case disagree, fix one of them before releasing.

This directory is published with `@formkiln/spec`, so the server build can consume a pinned version.

## Expression cases

`expressions/*.json` files conform to [`expression-cases.schema.json`](expression-cases.schema.json):

```json
{
  "description": "Calendar dates are YYYY-MM-DD strings.",
  "cases": [
    {
      "name": "today in Europe/London",
      "expression": { "date.today": [] },
      "now": "2026-11-24T23:30:00Z",
      "timeZone": "Europe/London",
      "expected": "2026-11-24"
    }
  ]
}
```

| Property     | Required | Meaning                                                                       |
| ------------ | -------- | ----------------------------------------------------------------------------- |
| `name`       | yes      | Unique within the file.                                                       |
| `expression` | yes      | The expression to evaluate.                                                   |
| `data`       | no       | Effective answers that paths resolve against. Default `{}`.                   |
| `scope`      | no       | Values of reserved names: `$item`, `$index`, `$value`, `$this`, `$thisIndex`. |
| `now`        | no       | Evaluation instant (RFC 3339). Required by cases that use `date.today`.       |
| `timeZone`   | no       | IANA time zone for `date.today`. Default `UTC`.                               |
| `expected`   | yes      | The expected result. Numbers compare by numeric value (`1` equals `1.0`).     |

## Validation cases

`validation/*.json` files conform to [`validation-cases.schema.json`](validation-cases.schema.json). Each file declares named `forms`, and each case validates answers against one of them (Form Schema §11):

| Property              | Required | Meaning                                                                                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                | yes      | Unique within the file.                                                                                                                 |
| `form`                | yes      | Key of a form in `forms`.                                                                                                               |
| `answers`             | yes      | Raw answers, before normalisation.                                                                                                      |
| `now`                 | no       | Evaluation instant (RFC 3339).                                                                                                          |
| `locale`              | no       | Locale for custom messages. Default: the form's `defaultLocale`.                                                                        |
| `expected.errors`     | yes      | The expected errors, **in order**. `path` and `code` are always compared; `message` and `params` only when present in the case.         |
| `expected.inactive`   | no       | Paths of all inactive elements (pages, panels, content, fields, repeaters; `repeater.index.child` inside repeaters), compared as a set. |
| `expected.submission` | no       | The submission data (§7.3), compared deeply.                                                                                            |
| `expected.outcome`    | no       | The selected outcome key, or `null`.                                                                                                    |

## Definition cases

`definitions/*.json` files conform to [`definition-cases.schema.json`](definition-cases.schema.json). Each case holds a structurally valid form document and the static errors (Form Schema §10) it must produce, as `{ "pointer", "code" }` pairs compared as an unordered set. An empty list means the document is valid.
