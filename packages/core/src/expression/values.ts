import type { JsonValue } from "@formkiln/spec";

export type JsonObject = { [key: string]: JsonValue };

/** A finite JSON number. */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Converts non-finite numbers (and `-0`) to their canonical result. */
export function finiteOrNull(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return value === 0 ? 0 : value;
}

/** Strict deep equality without type conversion (operators-v1 §4). */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]!))
    );
  }
  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key]!, b[key]!))
    );
  }
  return false;
}

/** `null`, `""`, `[]` and `{}` are empty (operators-v1 §6). */
export function isEmpty(value: JsonValue): boolean {
  if (value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}
