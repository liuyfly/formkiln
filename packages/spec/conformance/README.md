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

## Planned

- `validation/`: a form document plus answers, with the expected validation result (Form Schema §11).
- `definitions/`: invalid form documents with the expected static errors (Form Schema §10).
