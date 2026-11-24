# Formkiln Expression Operators — Version 1

|            |                                     |
| ---------- | ----------------------------------- |
| Status     | **Draft**                           |
| Applies to | [Form Schema v1](form-schema-v1.md) |

Formkiln expressions use the **syntax** of [JSON Logic](https://jsonlogic.com/) but define their own **semantics**. Generic JSON Logic libraries rely on JavaScript truthiness and loose equality, which cannot be reproduced exactly in other languages. Formkiln implementations therefore use their own evaluator, and the [conformance suite](../conformance) is the reference for every rule below.

## 1. Syntax and evaluation

An expression is one of:

- a JSON literal (`null`, boolean, number, string);
- an array, whose elements are evaluated as expressions (the result is an array);
- an **operation**: an object with exactly one key, the operator name, whose value is the argument list. A single non-array argument is shorthand for a one-element list: `{"var": "age"}` equals `{"var": ["age"]}`.

Arguments are evaluated left to right. `and`, `or` and `if` evaluate lazily as described below. Expressions have no side effects.

### 1.1 Values

Values are JSON values: `null`, boolean, number (IEEE 754 double), string, array and object. Numbers that are equal compare equal regardless of notation (`1` equals `1.0`). Non-finite results (division by zero, overflow) become `null`.

### 1.2 Truth

There is no truthiness. A value is **true** only if it is the boolean `true`. Conditions (`visible`, `required`, `if` branches, `when`, predicates) hold only for `true`; every other value, including `null`, `1` and `"yes"`, does not.

### 1.3 Errors

Evaluation never throws. An operator applied to arguments of the wrong type returns `null` unless stated otherwise. Unknown operators and wrong argument counts are **static** errors detected when the form is validated (Form Schema §10), not at runtime.

### 1.4 Numbers as text

Where a number is converted to a string (`cat`), the result is the ECMAScript `Number.prototype.toString()` representation (`1` not `1.0`, `0.1`, `1e21`). Java and other implementations MUST reproduce it.

## 2. Data access

| Operator | Arguments                           | Result                                                                                            |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `var`    | `path` (string), optional `default` | The value at `path`, or `default` (else `null`) if any segment is missing or the value is `null`. |

A path is a dot-separated list of segments. Numeric segments index arrays: `previousAddresses.0.address.city`. The first segment is either a field key (resolving against the effective answers) or one of these reserved names:

| Name         | Available in                           | Value                                 |
| ------------ | -------------------------------------- | ------------------------------------- |
| `$item`      | rules inside a repeater                | The current item object.              |
| `$index`     | rules inside a repeater                | Zero-based index of the current item. |
| `$value`     | `expression` validators                | The field's own effective value.      |
| `$this`      | the second argument of array operators | The current array element.            |
| `$thisIndex` | the second argument of array operators | Index of the current array element.   |

The path MUST be a string literal (not a computed expression) so that references can be checked statically. The empty path `""` is not allowed.

## 3. Logic

| Operator | Arguments                            | Result                                                                                                                                                                                                              |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `and`    | 1+                                   | `true` if every argument is `true`, otherwise `false`. Stops at the first argument that is not `true`.                                                                                                              |
| `or`     | 1+                                   | `true` if any argument is `true`, otherwise `false`. Stops at the first `true`.                                                                                                                                     |
| `!`      | 1                                    | `false` if the argument is `true`, otherwise `true`.                                                                                                                                                                |
| `if`     | 3, 5, 7… (`c1, v1, c2, v2, …, else`) | The value after the first condition that is `true`; otherwise the last argument. Only the selected branch is evaluated. With 1 argument it returns that argument; with an even count, the missing `else` is `null`. |

## 4. Comparison

| Operator             | Arguments | Result                                                                                                                                                                                                    |
| -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `==`                 | 2         | `true` if the arguments are deeply equal with no type conversion, otherwise `false`. Arrays compare element by element; objects compare by keys and values, ignoring key order. `null == null` is `true`. |
| `!=`                 | 2         | Negation of `==`.                                                                                                                                                                                         |
| `<`, `<=`, `>`, `>=` | 2         | Numeric comparison. If either argument is not a number, the result is `false`.                                                                                                                            |
| `<`, `<=`            | 3         | Range check `a < b < c` (or `a <= b <= c`). `false` if any argument is not a number.                                                                                                                      |

Compare dates with the date operators (§8), not with `<`: date values are strings and Formkiln never treats a string as a date because of its shape.

## 5. Arithmetic

All arithmetic operators return `null` if any argument is not a number.

| Operator     | Arguments                  | Result                                                                                                                                                                                           |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `+`          | 1+                         | Sum.                                                                                                                                                                                             |
| `-`          | 1 or 2                     | Negation, or difference.                                                                                                                                                                         |
| `*`          | 1+                         | Product.                                                                                                                                                                                         |
| `/`          | 2                          | Quotient; `null` if the divisor is `0`.                                                                                                                                                          |
| `%`          | 2                          | Remainder with the sign of the dividend; `null` if the divisor is `0`.                                                                                                                           |
| `min`, `max` | 1+                         | Smallest or largest argument.                                                                                                                                                                    |
| `round`      | 1 or 2 (`x`, `digits` = 0) | `x` rounded to `digits` decimal places (integer 0–10), **half away from zero**, applied to the shortest decimal representation of `x`. So `round(1.005, 2)` is `1.01` and `round(-2.5)` is `-3`. |

## 6. Emptiness

| Operator | Arguments | Result                                                                   |
| -------- | --------- | ------------------------------------------------------------------------ |
| `empty`  | 1         | `true` if the argument is `null`, `""`, `[]` or `{}`, otherwise `false`. |

## 7. Strings

| Operator         | Arguments               | Result                                                                                                                                                |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cat`            | 0+                      | Concatenation. Strings are used as is, numbers as in §1.4, `null` as `""`. Any other argument makes the result `null`.                                |
| `length`         | 1                       | Number of Unicode code points of a string, or number of elements of an array. `null` gives `0`. Other types give `null`.                              |
| `lower`, `upper` | 1                       | Locale-independent Unicode case mapping (Java: `Locale.ROOT`). `null` for non-strings.                                                                |
| `matches`        | 2 (`string`, `pattern`) | `true` if the whole string matches the portable regular expression (implicitly anchored at both ends). `false` if the first argument is not a string. |

### 7.1 Portable regular expressions

`matches` and the `pattern` validator accept only the subset below. Every construct has one meaning, and engines translate it to their native syntax: ECMAScript with the `u` flag, or `java.util.regex`. Patterns are validated statically, and a pattern outside the subset makes the form document invalid. At runtime, `matches` returns `null` for an invalid pattern.

| Construct                                                                       | Meaning                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any character except `\ . + * ? ( ) [ ] { } \| ^ $`                             | Itself. Matching is per Unicode code point.                                                                                                                                                                                                                                                                                                       |
| `\d` `\D`                                                                       | `[0-9]` and its complement (ASCII only).                                                                                                                                                                                                                                                                                                          |
| `\w` `\W`                                                                       | `[A-Za-z0-9_]` and its complement.                                                                                                                                                                                                                                                                                                                |
| `\s` `\S`                                                                       | `[ \t\n\r\f\v]` and its complement. No other whitespace (for example U+00A0) matches `\s`.                                                                                                                                                                                                                                                        |
| `\.` `\\` `\+` `\*` `\?` `\(` `\)` `\[` `\]` `\{` `\}` `\|` `\^` `\$` `\/` `\-` | The escaped character itself.                                                                                                                                                                                                                                                                                                                     |
| `.`                                                                             | Any code point except `\n` and `\r`.                                                                                                                                                                                                                                                                                                              |
| `[...]` `[^...]`                                                                | A character class or its complement. Inside a class: single characters, ranges `a-z` between two single characters, `\d`, `\w`, `\s`, and the escapes `\\ \] \[ \^ \-`. A `-` that is not between two single characters is literal. A class MUST NOT be empty, nested, contain `&&` or contain `\D`, `\W` or `\S`. A literal `]` MUST be escaped. |
| `(...)` `(?:...)`                                                               | Capturing and non-capturing groups (captures are not exposed).                                                                                                                                                                                                                                                                                    |
| `\|`                                                                            | Alternation.                                                                                                                                                                                                                                                                                                                                      |
| `*` `+` `?` `{n}` `{n,}` `{n,m}`                                                | Greedy quantifiers; `n <= m`.                                                                                                                                                                                                                                                                                                                     |
| `^` `$`                                                                         | Start and very end of the string. (`$` does not match before a trailing newline.)                                                                                                                                                                                                                                                                 |

Everything else is not allowed. This includes backreferences, lookaround, named groups, lazy or possessive quantifiers, inline flags, `\b`, `\uXXXX` and Unicode property escapes.

## 8. Dates

Date values are `YYYY-MM-DD` strings (Form Schema §6.1). An argument that is not a valid date makes the result `null`.

| Operator     | Arguments                    | Result                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date.today` | 0                            | The calendar date at the evaluation instant in `settings.timeZone`.                                                                                                                                                                                         |
| `date.add`   | 3 (`date`, `amount`, `unit`) | `date` plus `amount` (integer, may be negative) `unit`s, where `unit` is `"day"`, `"week"`, `"month"` or `"year"`. Adding months or years clamps to the last day of the month: `2025-01-31` + 1 month = `2025-02-28`, `2024-02-29` + 1 year = `2025-02-28`. |
| `date.diff`  | 3 (`from`, `to`, `unit`)     | Number of **complete** `unit`s from `from` to `to` (`"day"`, `"week"`, `"month"`, `"year"`), negative if `to` is before `from`. Month and year counting follows calendar arithmetic: `date.diff("2000-02-29", "2001-02-28", "year")` is `0`.                |

Example — at least 18 years old:

```json
{ ">=": [{ "date.diff": [{ "var": "$value" }, { "date.today": [] }, "year"] }, 18] }
```

`datetime` and `time` values have no dedicated operators in v1. They can be compared with `==`, `!=` and tested with `empty`.

## 9. Arrays

| Operator | Arguments                | Result                                                                                                                                                          |
| -------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `in`     | 2 (`needle`, `haystack`) | If `haystack` is an array: `true` if some element is `==` to `needle`. If both are strings: `true` if `needle` is a substring of `haystack`. Otherwise `false`. |
| `some`   | 2 (`array`, predicate)   | `true` if the predicate is `true` for at least one element. `false` for an empty array or `null`.                                                               |
| `all`    | 2 (`array`, predicate)   | `true` if the predicate is `true` for every element. `true` for an empty array, `false` for `null`.                                                             |
| `none`   | 2 (`array`, predicate)   | `true` if the predicate is `true` for no element. `true` for an empty array or `null`.                                                                          |
| `map`    | 2 (`array`, expression)  | Array of the expression's results. `null` if the first argument is not an array.                                                                                |
| `filter` | 2 (`array`, predicate)   | Array of the elements for which the predicate is `true`. `null` if the first argument is not an array.                                                          |
| `sum`    | 1 (`array`)              | Sum of the elements. `0` for an empty array; `null` if any element is not a number or the argument is not an array.                                             |

The second argument of `some`, `all`, `none`, `map` and `filter` is evaluated once per element, with `$this` bound to the element and `$thisIndex` to its index. All other paths still resolve against the form answers. A first argument that is not an array is treated like `null`.

Example — total monthly rent across all items of a repeater:

```json
{ "sum": [{ "map": [{ "var": "properties" }, { "var": "$this.monthlyRent" }] }] }
```

## 10. Arity

A form document is invalid if an operation has a number of arguments outside this table (Form Schema §10, code `arity`).

| Arguments | Operators                                                                                |
| --------- | ---------------------------------------------------------------------------------------- |
| 0         | `date.today`                                                                             |
| 0 or more | `cat`                                                                                    |
| 1         | `!`, `empty`, `length`, `lower`, `upper`, `sum`                                          |
| 1 or 2    | `var`, `-`, `round`                                                                      |
| 1 or more | `and`, `or`, `if`, `+`, `*`, `min`, `max`                                                |
| 2         | `==`, `!=`, `>`, `>=`, `/`, `%`, `matches`, `in`, `some`, `all`, `none`, `map`, `filter` |
| 2 or 3    | `<`, `<=`                                                                                |
| 3         | `date.add`, `date.diff`                                                                  |

## 11. Operators intentionally not supported

| JSON Logic operator                | Reason / replacement                             |
| ---------------------------------- | ------------------------------------------------ |
| `===`, `!==`                       | `==` and `!=` are already strict.                |
| `!!`                               | No truthiness; use `==` or `empty`.              |
| `missing`, `missing_some`          | Use the `required` rule.                         |
| `reduce`                           | Use `sum`, `map` and `filter`.                   |
| `merge`, `substr`, `log`, `method` | Not needed in v1; `log` and `method` are unsafe. |
