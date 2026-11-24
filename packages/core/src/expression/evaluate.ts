import type { Expression, JsonValue } from "@formkiln/spec";
import { addToDate, diffDates, isDateUnit, parseDate, todayIn } from "./dates";
import { roundHalfAwayFromZero } from "./decimal";
import { compilePortableRegex } from "./regex";
import {
  deepEqual,
  finiteOrNull,
  isEmpty,
  isNumber,
  isPlainObject,
  type JsonObject,
} from "./values";

/** Reserved names that `var` paths may start with (operators-v1 §2). */
export interface Scope {
  $item?: JsonValue;
  $index?: number;
  $value?: JsonValue;
  $this?: JsonValue;
  $thisIndex?: number;
}

export interface EvaluateOptions {
  /** Effective answers that paths resolve against. */
  data?: JsonObject;
  /** Values of reserved names. */
  scope?: Scope;
  /** Evaluation instant for `date.today`. Defaults to the current time. */
  now?: Date | string;
  /** IANA time zone for `date.today`. Defaults to `UTC`. */
  timeZone?: string;
}

interface Context {
  data: JsonObject;
  scope: Scope;
  now: () => Date;
  timeZone: string;
}

type Operation = (args: readonly Expression[], ctx: Context) => JsonValue;

/**
 * Evaluates a Formkiln expression (operators-v1). Never throws: invalid
 * operations evaluate to `null`.
 */
export function evaluate(expression: Expression, options: EvaluateOptions = {}): JsonValue {
  let instant: Date | undefined;
  const ctx: Context = {
    data: options.data ?? {},
    scope: options.scope ?? {},
    timeZone: options.timeZone ?? "UTC",
    now: () => (instant ??= options.now === undefined ? new Date() : new Date(options.now)),
  };
  return evaluateIn(expression, ctx);
}

/** A condition holds only when it evaluates to `true` (operators-v1 §1.2). */
export function isTrue(value: JsonValue): boolean {
  return value === true;
}

function evaluateIn(expression: Expression, ctx: Context): JsonValue {
  if (expression === null || typeof expression !== "object") {
    return expression;
  }
  if (Array.isArray(expression)) {
    return expression.map((item) => evaluateIn(item, ctx));
  }
  const keys = Object.keys(expression);
  if (keys.length !== 1) return null;
  const operator = keys[0]!;
  const operation = Object.hasOwn(OPERATIONS, operator) ? OPERATIONS[operator] : undefined;
  if (!operation) return null;
  const raw = (expression as Record<string, Expression>)[operator]!;
  return operation(Array.isArray(raw) ? raw : [raw], ctx);
}

/** Evaluates all arguments eagerly. */
function eager(fn: (values: JsonValue[], ctx: Context) => JsonValue): Operation {
  return (args, ctx) =>
    fn(
      args.map((arg) => evaluateIn(arg, ctx)),
      ctx,
    );
}

function numbers(values: JsonValue[]): number[] | null {
  return values.length > 0 && values.every(isNumber) ? (values as number[]) : null;
}

function arithmetic(fn: (values: number[]) => number | null): Operation {
  return eager((values) => {
    const nums = numbers(values);
    if (!nums) return null;
    const result = fn(nums);
    return result === null ? null : finiteOrNull(result);
  });
}

function ordering(compare: (a: number, b: number) => boolean): Operation {
  return eager((values) => {
    if (values.length !== 2 && values.length !== 3) return false;
    const nums = numbers(values);
    if (!nums) return false;
    return compare(nums[0]!, nums[1]!) && (nums.length === 2 || compare(nums[1]!, nums[2]!));
  });
}

function resolvePath(path: string, ctx: Context): JsonValue | undefined {
  if (path === "") return undefined;
  const segments = path.split(".");
  const head = segments[0]!;
  let current: JsonValue | undefined;
  if (head.startsWith("$")) {
    current = Object.hasOwn(ctx.scope, head) ? ctx.scope[head as keyof Scope] : undefined;
  } else {
    current = Object.hasOwn(ctx.data, head) ? ctx.data[head] : undefined;
  }
  for (const segment of segments.slice(1)) {
    if (Array.isArray(current) && /^(0|[1-9]\d*)$/.test(segment)) {
      current = current[Number(segment)];
    } else if (isPlainObject(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Evaluates `body` once per element of `list`, binding `$this` and `$thisIndex`. */
function eachElement<T>(
  list: JsonValue[],
  body: Expression,
  ctx: Context,
  fn: (result: JsonValue, element: JsonValue) => T,
): T[] {
  return list.map((element, index) =>
    fn(
      evaluateIn(body, { ...ctx, scope: { ...ctx.scope, $this: element, $thisIndex: index } }),
      element,
    ),
  );
}

function quantifier(onNonArray: boolean, test: (results: boolean[]) => boolean): Operation {
  return (args, ctx) => {
    if (args.length !== 2) return null;
    const list = evaluateIn(args[0]!, ctx);
    if (!Array.isArray(list)) return onNonArray;
    // Short-circuiting is not observable: expressions have no side effects.
    return test(eachElement(list, args[1]!, ctx, (result) => result === true));
  };
}

const OPERATIONS: Readonly<Record<string, Operation>> = {
  // §2 Data access
  var: (args, ctx) => {
    const [path, fallback] = args.map((arg) => evaluateIn(arg, ctx));
    const value = typeof path === "string" ? resolvePath(path, ctx) : undefined;
    return value === undefined || value === null ? (fallback ?? null) : value;
  },

  // §3 Logic
  and: (args, ctx) => args.length > 0 && args.every((arg) => evaluateIn(arg, ctx) === true),
  or: (args, ctx) => args.some((arg) => evaluateIn(arg, ctx) === true),
  "!": eager((values) => values.length === 1 && values[0] !== true),
  if: (args, ctx) => {
    let i = 0;
    for (; i + 1 < args.length; i += 2) {
      if (evaluateIn(args[i]!, ctx) === true) return evaluateIn(args[i + 1]!, ctx);
    }
    return i < args.length ? evaluateIn(args[i]!, ctx) : null;
  },

  // §4 Comparison
  "==": eager((values) => values.length === 2 && deepEqual(values[0]!, values[1]!)),
  "!=": eager((values) => values.length === 2 && !deepEqual(values[0]!, values[1]!)),
  "<": ordering((a, b) => a < b),
  "<=": ordering((a, b) => a <= b),
  ">": ordering((a, b) => a > b),
  ">=": ordering((a, b) => a >= b),

  // §5 Arithmetic
  "+": arithmetic((n) => n.reduce((a, b) => a + b, 0)),
  "-": arithmetic((n) => (n.length === 1 ? -n[0]! : n.length === 2 ? n[0]! - n[1]! : null)),
  "*": arithmetic((n) => n.reduce((a, b) => a * b, 1)),
  "/": arithmetic((n) => (n.length === 2 && n[1] !== 0 ? n[0]! / n[1]! : null)),
  "%": arithmetic((n) => (n.length === 2 && n[1] !== 0 ? n[0]! % n[1]! : null)),
  min: arithmetic((n) => Math.min(...n)),
  max: arithmetic((n) => Math.max(...n)),
  round: eager((values) => {
    const [x, digits = 0] = values;
    if (values.length > 2 || !isNumber(x) || !Number.isInteger(digits)) return null;
    const d = digits as number;
    return d >= 0 && d <= 10 ? roundHalfAwayFromZero(x, d) : null;
  }),

  // §6 Emptiness
  empty: eager((values) => values.length === 1 && isEmpty(values[0]!)),

  // §7 Strings
  cat: eager((values) => {
    let text = "";
    for (const value of values) {
      if (typeof value === "string") text += value;
      else if (isNumber(value)) text += String(value);
      else if (value !== null) return null;
    }
    return text;
  }),
  length: eager(([value, ...rest]) => {
    if (rest.length > 0) return null;
    if (value === null) return 0;
    if (typeof value === "string") return [...value].length;
    if (Array.isArray(value)) return value.length;
    return null;
  }),
  lower: eager(([value]) => (typeof value === "string" ? value.toLowerCase() : null)),
  upper: eager(([value]) => (typeof value === "string" ? value.toUpperCase() : null)),
  matches: eager(([text, pattern]) => {
    if (typeof pattern !== "string") return null;
    const compiled = compilePortableRegex(pattern);
    if (!compiled.ok) return null;
    return typeof text === "string" && compiled.regex.test(text);
  }),

  // §8 Dates
  "date.today": (args, ctx) => (args.length === 0 ? todayIn(ctx.now(), ctx.timeZone) : null),
  "date.add": eager(([value, amount, unit]) => {
    const date = parseDate(value);
    if (!date || !Number.isInteger(amount) || !isDateUnit(unit)) return null;
    return addToDate(date, amount as number, unit);
  }),
  "date.diff": eager(([fromValue, toValue, unit]) => {
    const from = parseDate(fromValue);
    const to = parseDate(toValue);
    if (!from || !to || !isDateUnit(unit)) return null;
    return diffDates(from, to, unit);
  }),

  // §9 Arrays
  in: eager(([needle, haystack]) => {
    if (Array.isArray(haystack)) return haystack.some((item) => deepEqual(item, needle!));
    if (typeof haystack === "string" && typeof needle === "string") {
      return haystack.includes(needle);
    }
    return false;
  }),
  some: quantifier(false, (results) => results.some(Boolean)),
  all: quantifier(false, (results) => results.every(Boolean)),
  none: quantifier(true, (results) => !results.some(Boolean)),
  map: (args, ctx) => {
    if (args.length !== 2) return null;
    const list = evaluateIn(args[0]!, ctx);
    return Array.isArray(list) ? eachElement(list, args[1]!, ctx, (result) => result) : null;
  },
  filter: (args, ctx) => {
    if (args.length !== 2) return null;
    const list = evaluateIn(args[0]!, ctx);
    if (!Array.isArray(list)) return null;
    return eachElement(list, args[1]!, ctx, (result, element) => ({ result, element }))
      .filter(({ result }) => result === true)
      .map(({ element }) => element);
  },
  sum: eager(([list, ...rest]) => {
    if (rest.length > 0 || !Array.isArray(list) || !list.every(isNumber)) return null;
    return finiteOrNull((list as number[]).reduce((a, b) => a + b, 0));
  }),
};
