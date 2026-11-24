import { describe, expect, it } from "vitest";
import { compilePortableRegex } from "./regex";

function matches(pattern: string, text: string): boolean {
  const result = compilePortableRegex(pattern);
  if (!result.ok) throw new Error(result.error);
  return result.regex.test(text);
}

describe("compilePortableRegex", () => {
  it.each([
    ["\\d{2}-?\\d{2}-?\\d{2}", "12-34-56", true],
    ["\\d{6}", "123456x", false],
    ["[A-Z]{2}\\d", "AB1", true],
    ["[a-c\\-]+", "a-c", true],
    ["[-a]", "-", true],
    ["[\\d.]+", "1.5", true],
    ["[^\\s]+", "a b", true],
    ["\\s", " ", false],
    ["a.c", "a\nc", false],
    ["a.c", "a\u0085c", true],
    ["(?:ab)+", "abab", true],
    ["(a|b)c", "bc", true],
    ["\\$\\d+(\\.\\d{2})?", "$10.50", true],
    [".", "\u{1F600}", true],
  ])("%s on %j is %s", (pattern, text, expected) => {
    expect(matches(pattern, text)).toBe(expected);
  });

  it.each([
    ["\\b", "word boundary"],
    ["(?=a)", "lookahead"],
    ["(?<name>a)", "named group"],
    ["a+?", "lazy quantifier"],
    ["a++", "possessive quantifier"],
    ["(a)\\1", "backreference"],
    ["[a[b]]", "nested class"],
    ["[a&&b]", "class intersection"],
    ["[\\S]", "negated shorthand in a class"],
    ["[z-a]", "reversed range"],
    ["a{3,1}", "reversed quantifier"],
    ["(a", "unbalanced group"],
    ["a]", "unescaped ]"],
    ["*a", "nothing to repeat"],
    ["\\u0041", "unicode escape"],
    ["[]", "empty class"],
  ])("rejects %s (%s)", (pattern) => {
    expect(compilePortableRegex(pattern).ok).toBe(false);
  });
});
