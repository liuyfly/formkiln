import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedForm } from "../../../lib/api";
import { negotiateLocale } from "../../../lib/locale";
import { HostedForm } from "./HostedForm";

interface Props {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

function resolve(text: unknown, locale: string, fallback: string): string | undefined {
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const map = text as Record<string, string>;
    return map[locale] ?? map[fallback] ?? Object.values(map)[0];
  }
  return undefined;
}

async function load({ params, searchParams }: Props) {
  const { formKey } = await params;
  const published = await getPublishedForm(formKey);
  if (!published) notFound();
  const { lang } = await searchParams;
  const locale = negotiateLocale(
    published.definition,
    Array.isArray(lang) ? lang[0] : lang,
    (await headers()).get("accept-language"),
  );
  return { published, locale };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { published, locale } = await load(props);
  const form = published.definition;
  return {
    title: resolve(form.title, locale, form.settings?.defaultLocale ?? "en") ?? form.key,
    robots: { index: false, follow: false },
  };
}

export default async function FormPage(props: Props) {
  const { published, locale } = await load(props);
  const form = published.definition;
  const fallback = form.settings?.defaultLocale ?? "en";
  const description = resolve(form.description, locale, fallback);
  return (
    <main className="hosted-main" lang={locale}>
      <div className="hosted-card">
        <h1 className="hosted-title">{resolve(form.title, locale, fallback)}</h1>
        {description && <p className="hosted-description">{description}</p>}
        <HostedForm form={form} version={published.version} locale={locale} />
      </div>
    </main>
  );
}
