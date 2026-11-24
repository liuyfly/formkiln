import type { Field, JsonValue, ValueType } from "@formkiln/spec";
import { parseDate } from "../expression/dates";
import { isNumber, isPlainObject, type JsonObject } from "../expression/values";
import { partsOf } from "./model";

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATETIME =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,9})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;
const FILE_KEYS = ["contentType", "id", "name", "size"];

/**
 * Normalises a raw answer (Form Schema §6.5). Repeater items are returned as is;
 * their children are normalised separately.
 */
export function normalizeValue(valueType: ValueType, raw: JsonValue | undefined): JsonValue {
  if (raw === undefined || raw === null || raw === "") return null;
  if (Array.isArray(raw)) return raw.length === 0 ? null : raw;
  if (isPlainObject(raw)) {
    if (valueType === "name" || valueType === "address") {
      const members: JsonObject = {};
      for (const [key, value] of Object.entries(raw)) {
        if (value !== "" && value !== null) members[key] = value;
      }
      return Object.keys(members).length === 0 ? null : members;
    }
    return Object.keys(raw).length === 0 ? null : raw;
  }
  return raw;
}

function isFileRef(value: JsonValue): boolean {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.length === FILE_KEYS.length &&
    keys.every((key, i) => key === FILE_KEYS[i]) &&
    ["id", "name", "contentType"].every(
      (key) => typeof value[key] === "string" && value[key] !== "",
    ) &&
    Number.isInteger(value.size) &&
    (value.size as number) >= 0
  );
}

/** Checks a normalised, non-null value against a value type (Form Schema §6.7). */
export function hasValueType(valueType: ValueType, value: JsonValue, field?: Field): boolean {
  switch (valueType) {
    case "string":
      return typeof value === "string";
    case "number":
      return isNumber(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return parseDate(value) !== null;
    case "time":
      return typeof value === "string" && TIME.test(value);
    case "datetime": {
      if (typeof value !== "string") return false;
      const match = DATETIME.exec(value);
      return match !== null && parseDate(match[1]) !== null;
    }
    case "string[]":
      return (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string") &&
        new Set(value).size === value.length
      );
    case "file[]":
      return Array.isArray(value) && value.every(isFileRef);
    case "name":
    case "address": {
      if (!isPlainObject(value)) return false;
      const parts = field ? partsOf(field) : null;
      return Object.entries(value).every(
        ([key, member]) => typeof member === "string" && (parts === null || parts.includes(key)),
      );
    }
    case "item[]":
      return Array.isArray(value) && value.every(isPlainObject);
  }
}
