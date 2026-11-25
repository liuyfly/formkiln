/** Display facts from a form definition: field labels and option labels, in document order. */

type Text = string | Record<string, string>;

export interface FieldInfo {
  label: string;
  /** Option labels by value, for choice fields. */
  options?: Map<string, string>;
}

export type FieldInfoMap = Map<string, FieldInfo>;

function text(value: unknown, locale: string): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, string>;
    return map[locale] ?? Object.values(map)[0];
  }
  return undefined;
}

/**
 * Labels of the fields and repeaters of a definition by key (the first occurrence wins), in
 * document order. Uses the form's default locale.
 */
export function fieldInfo(definition: unknown): FieldInfoMap {
  const result: FieldInfoMap = new Map();
  if (!definition || typeof definition !== "object") return result;
  const form = definition as { settings?: { defaultLocale?: string }; pages?: unknown[] };
  const locale = form.settings?.defaultLocale ?? "en";
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const element = node as {
      type?: string;
      key?: string;
      label?: Text;
      options?: { value: string; label: Text }[];
      elements?: unknown[];
    };
    if (
      element.type &&
      element.type !== "panel" &&
      element.key &&
      element.label !== undefined &&
      !result.has(element.key)
    ) {
      const options = Array.isArray(element.options)
        ? new Map(
            element.options.map((option) => [
              option.value,
              text(option.label, locale) ?? option.value,
            ]),
          )
        : undefined;
      result.set(element.key, {
        label: text(element.label, locale) ?? element.key,
        ...(options && { options }),
      });
    }
    element.elements?.forEach(visit);
  };
  (form.pages ?? []).forEach(visit);
  return result;
}

/** Replaces choice values with their option labels (single values and lists of values). */
export function withOptionLabels(value: unknown, info: FieldInfo | undefined): unknown {
  if (!info?.options) return value;
  if (typeof value === "string") return info.options.get(value) ?? value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.map((item) => info.options!.get(item) ?? item);
  }
  return value;
}

/** Entries of submission data ordered as in the definition; unknown keys last. */
export function orderedEntries(
  data: Record<string, unknown>,
  fields: FieldInfoMap,
): [string, unknown][] {
  const known = [...fields.keys()].filter((key) => key in data);
  const rest = Object.keys(data).filter((key) => !fields.has(key));
  return [...known, ...rest].map((key) => [key, data[key]]);
}
