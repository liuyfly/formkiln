import type { FormDocument } from "@formkiln/spec";

/**
 * Picks the locale to render: an explicit `?lang=` that the form supports, otherwise the best
 * match from Accept-Language, otherwise the form's default locale.
 */
export function negotiateLocale(
  form: FormDocument,
  requested: string | undefined,
  acceptLanguage: string | null,
): string {
  const defaultLocale = form.settings?.defaultLocale ?? "en";
  const supported = form.settings?.locales ?? [defaultLocale];
  const match = (tag: string) =>
    supported.find((locale) => locale.toLowerCase() === tag.toLowerCase()) ??
    supported.find(
      (locale) => locale.toLowerCase().split("-")[0] === tag.toLowerCase().split("-")[0],
    );

  if (requested) {
    const found = match(requested);
    if (found) return found;
  }
  const preferences = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((p) => p.tag && p.tag !== "*" && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of preferences) {
    const found = match(tag);
    if (found) return found;
  }
  return defaultLocale;
}
