import type { FormDocument, Text } from "@formkiln/spec";

/** Resolves a Text for a locale, falling back to the form's default locale. */
export function resolveText(
  text: Text | undefined,
  locale: string,
  form: FormDocument,
): string | undefined {
  if (text === undefined || typeof text === "string") return text;
  const fallback = form.settings?.defaultLocale ?? "en";
  return text[locale] ?? text[fallback] ?? Object.values(text)[0];
}
