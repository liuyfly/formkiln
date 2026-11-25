import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { embedSubject, isEmbedToken, loadForm } from "../../../lib/api";
import { negotiateLocale } from "../../../lib/locale";
import { hostedMessages } from "../../../lib/messages";
import { HostedForm } from "./HostedForm";

type Param = string | string[] | undefined;

interface Props {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ lang?: Param; token?: Param }>;
}

const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

function resolve(text: unknown, locale: string, fallback: string): string | undefined {
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const map = text as Record<string, string>;
    return map[locale] ?? map[fallback] ?? Object.values(map)[0];
  }
  return undefined;
}

/** A short hash of the embed token's subject, so drafts of different users stay apart. */
function draftScope(embedToken: string | null): string {
  const subject = embedToken ? embedSubject(embedToken) : null;
  return subject ? createHash("sha256").update(subject).digest("base64url").slice(0, 16) : "";
}

/** Locale for pages without a form (expired link): `?lang=`, then Accept-Language. */
async function fallbackLocale(lang: string | undefined) {
  const accept = (await headers()).get("accept-language") ?? "";
  return lang ?? accept.split(",")[0]?.split(";")[0]?.trim() ?? "en";
}

async function load({ params, searchParams }: Props) {
  const { formKey } = await params;
  const query = await searchParams;
  const lang = first(query.lang);
  const token = first(query.token);
  const embedToken = isEmbedToken(token) ? token : null;
  const result = await loadForm(formKey, embedToken ?? undefined);
  if (result.status === "notFound") notFound();
  if (result.status === "unauthorized") {
    return { expired: true as const, locale: await fallbackLocale(lang) };
  }
  const published = result.form;
  const locale = negotiateLocale(
    published.definition,
    lang,
    (await headers()).get("accept-language"),
  );
  return { expired: false as const, published, locale, embedToken };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const loaded = await load(props);
  if (loaded.expired) {
    return { title: hostedMessages(loaded.locale).linkExpired, robots: { index: false } };
  }
  const form = loaded.published.definition;
  return {
    title: resolve(form.title, loaded.locale, form.settings?.defaultLocale ?? "en") ?? form.key,
    robots: { index: false, follow: false },
  };
}

export default async function FormPage(props: Props) {
  const loaded = await load(props);
  if (loaded.expired) {
    const messages = hostedMessages(loaded.locale);
    return (
      <main className="hosted-main">
        <div className="hosted-card">
          <h1 className="hosted-title">{messages.linkExpired}</h1>
          <p className="hosted-description">{messages.linkExpiredHint}</p>
        </div>
      </main>
    );
  }
  const { published, locale, embedToken } = loaded;
  const form = published.definition;
  const fallback = form.settings?.defaultLocale ?? "en";
  const description = resolve(form.description, locale, fallback);
  return (
    <main className="hosted-main" lang={locale}>
      <div className="hosted-card">
        <h1 className="hosted-title">{resolve(form.title, locale, fallback)}</h1>
        {description && <p className="hosted-description">{description}</p>}
        <HostedForm
          form={form}
          version={published.version}
          locale={locale}
          embedToken={published.accessMode === "token" ? embedToken : null}
          draftScope={draftScope(embedToken)}
          captcha={published.captcha}
          resumeByEmail={published.resumeByEmail === true}
        />
      </div>
    </main>
  );
}
