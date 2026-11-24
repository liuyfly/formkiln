/**
 * Portable regular expressions (operators-v1 §7.1).
 *
 * Patterns are parsed against the portable subset and translated into an
 * equivalent ECMAScript pattern, so that `\s`, `.` and `$` mean exactly the same
 * thing as in the Java engine. Anything outside the subset is rejected.
 */

export type PortableRegexResult = { ok: true; regex: RegExp } | { ok: false; error: string };

const WHITESPACE = " \\t\\n\\r\\f\\v";
const CLASS_ESCAPES: Readonly<Record<string, string>> = {
  d: "0-9",
  w: "A-Za-z0-9_",
  s: WHITESPACE,
};
const SHORTHANDS: Readonly<Record<string, string>> = {
  d: "[0-9]",
  D: "[^0-9]",
  w: "[A-Za-z0-9_]",
  W: "[^A-Za-z0-9_]",
  s: `[${WHITESPACE}]`,
  S: `[^${WHITESPACE}]`,
};
/** Characters that may be escaped to stand for themselves outside a class. */
const LITERAL_ESCAPES = new Set([..."\\.+*?()[]{}|^$/-"]);
/** Characters that may be escaped to stand for themselves inside a class. */
const CLASS_LITERAL_ESCAPES = new Set([..."\\]^-["]);
/** Characters that must be escaped when emitted as literals. */
const SYNTAX = new Set([..."\\^$.*+?()[]{}|/"]);

const cache = new Map<string, PortableRegexResult>();

/** Compiles a portable pattern into an anchored, full-match ECMAScript RegExp. */
export function compilePortableRegex(pattern: string): PortableRegexResult {
  let result = cache.get(pattern);
  if (!result) {
    result = compile(pattern);
    cache.set(pattern, result);
  }
  return result;
}

function escapeLiteral(char: string): string {
  return SYNTAX.has(char) ? `\\${char}` : char;
}

function compile(pattern: string): PortableRegexResult {
  const chars = [...pattern];
  let out = "";
  let i = 0;
  let groupDepth = 0;
  // Whether the previous token can take a quantifier.
  let quantifiable = false;

  const fail = (message: string): PortableRegexResult => ({
    ok: false,
    error: `${message} at position ${i} in pattern ${JSON.stringify(pattern)}`,
  });

  while (i < chars.length) {
    const c = chars[i]!;
    switch (c) {
      case "\\": {
        const next = chars[i + 1];
        if (next === undefined) return fail("Trailing backslash");
        if (SHORTHANDS[next]) out += SHORTHANDS[next];
        else if (LITERAL_ESCAPES.has(next)) out += escapeLiteral(next);
        else return fail(`Unsupported escape \\${next}`);
        i += 2;
        quantifiable = true;
        continue;
      }
      case "[": {
        const parsed = parseClass(chars, i);
        if ("error" in parsed) return fail(parsed.error);
        out += parsed.source;
        i = parsed.end;
        quantifiable = true;
        continue;
      }
      case "(": {
        if (chars[i + 1] === "?") {
          if (chars[i + 2] !== ":") return fail("Only (?:...) groups are supported");
          out += "(?:";
          i += 3;
        } else {
          out += "(";
          i += 1;
        }
        groupDepth++;
        quantifiable = false;
        continue;
      }
      case ")":
        if (groupDepth === 0) return fail("Unbalanced )");
        groupDepth--;
        out += ")";
        i += 1;
        quantifiable = true;
        continue;
      case "|":
        out += "|";
        i += 1;
        quantifiable = false;
        continue;
      case "^":
        out += "^";
        i += 1;
        quantifiable = false;
        continue;
      case "$":
        out += "$";
        i += 1;
        quantifiable = false;
        continue;
      case ".":
        out += "[^\\n\\r]";
        i += 1;
        quantifiable = true;
        continue;
      case "*":
      case "+":
      case "?":
      case "{": {
        if (!quantifiable) return fail(`Nothing to repeat before ${c}`);
        let quantifier: string = c;
        let end = i + 1;
        if (c === "{") {
          const match = /^\{(\d+)(,(\d*))?\}/.exec(chars.slice(i).join(""));
          if (!match) return fail("Invalid {n,m} quantifier");
          if (match[3] && Number(match[3]) < Number(match[1])) {
            return fail("Quantifier maximum is smaller than its minimum");
          }
          quantifier = match[0];
          end = i + [...match[0]].length;
        }
        if (chars[end] === "?" || chars[end] === "+") {
          return fail("Lazy and possessive quantifiers are not supported");
        }
        out += quantifier;
        i = end;
        quantifiable = false;
        continue;
      }
      case "]":
      case "}":
        return fail(`Unescaped ${c}`);
      default:
        out += escapeLiteral(c);
        i += 1;
        quantifiable = true;
    }
  }
  if (groupDepth !== 0) return fail("Unbalanced (");

  try {
    return { ok: true, regex: new RegExp(`^(?:${out})$`, "u") };
  } catch (error) {
    return fail(`Invalid pattern (${(error as Error).message})`);
  }
}

type ClassAtom =
  { kind: "char"; value: string } | { kind: "shorthand"; source: string } | { kind: "hyphen" };

function emitClassChar(char: string): string {
  return CLASS_LITERAL_ESCAPES.has(char) ? `\\${char}` : char;
}

function parseClass(
  chars: string[],
  start: number,
): { source: string; end: number } | { error: string } {
  let i = start + 1;
  const negated = chars[i] === "^";
  if (negated) i++;

  // 1. Tokenise the class body.
  const atoms: ClassAtom[] = [];
  let closed = false;
  while (i < chars.length) {
    const c = chars[i]!;
    if (c === "]") {
      if (atoms.length === 0) return { error: "Empty character class" };
      closed = true;
      i++;
      break;
    }
    if (c === "[") return { error: "Nested [ inside a character class" };
    if (c === "&" && chars[i + 1] === "&") return { error: "&& inside a character class" };
    if (c === "\\") {
      const next = chars[i + 1];
      if (next === undefined) return { error: "Trailing backslash" };
      if (CLASS_ESCAPES[next]) atoms.push({ kind: "shorthand", source: CLASS_ESCAPES[next] });
      else if (CLASS_LITERAL_ESCAPES.has(next)) atoms.push({ kind: "char", value: next });
      else return { error: `Unsupported escape \\${next} inside a character class` };
      i += 2;
    } else {
      atoms.push(c === "-" ? { kind: "hyphen" } : { kind: "char", value: c });
      i++;
    }
  }
  if (!closed) return { error: "Unterminated character class" };

  // 2. Emit, turning char-hyphen-char into ranges and other hyphens into literals.
  let source = negated ? "[^" : "[";
  for (let k = 0; k < atoms.length; k++) {
    const atom = atoms[k]!;
    const hyphen = atoms[k + 1];
    const high = atoms[k + 2];
    if (atom.kind === "char" && hyphen?.kind === "hyphen" && high?.kind === "char") {
      if (atom.value.codePointAt(0)! > high.value.codePointAt(0)!) {
        return { error: "Range out of order" };
      }
      source += `${emitClassChar(atom.value)}-${emitClassChar(high.value)}`;
      k += 2;
    } else if (atom.kind === "hyphen") {
      source += "\\-";
    } else if (atom.kind === "shorthand") {
      source += atom.source;
    } else {
      source += emitClassChar(atom.value);
    }
  }
  return { source: source + "]", end: i };
}
