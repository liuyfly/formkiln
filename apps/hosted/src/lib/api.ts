import "server-only";
import type { FormDocument } from "@formkiln/spec";

/** Base URL of formkiln-server. Only the Next.js server talks to it. */
export const API_URL = (process.env.FORMKILN_API_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

export interface RuntimeForm {
  key: string;
  version: number;
  publishedAt: string;
  accessMode: "public" | "token";
  /** Human verification to show before submitting, or null. */
  captcha: { provider: string; siteKey: string } | null;
  /** Whether the form offers "email me a link to continue later". */
  resumeByEmail: boolean;
  definition: FormDocument;
}

export type LoadResult =
  { status: "ok"; form: RuntimeForm } | { status: "notFound" } | { status: "unauthorized" };

const KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;
/** Embed tokens are two base64url segments. */
const EMBED_TOKEN = /^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,256}$/;

export function isFormKey(value: string): boolean {
  return KEY.test(value);
}

export function isEmbedToken(value: string | null | undefined): value is string {
  return typeof value === "string" && EMBED_TOKEN.test(value);
}

/**
 * The subject claim of an embed token, without verifying it (formkiln-server does). Only used to
 * keep the drafts of different users of one browser apart.
 */
export function embedSubject(token: string): string | null {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString("utf8"));
    return typeof claims?.s === "string" ? claims.s : null;
  } catch {
    return null;
  }
}

/** The latest published version of a form. Token forms need a valid embed token. */
export async function loadForm(key: string, embedToken?: string): Promise<LoadResult> {
  if (!isFormKey(key)) return { status: "notFound" };
  const response = await fetch(`${API_URL}/v1/forms/${key}`, {
    cache: "no-store",
    headers: isEmbedToken(embedToken) ? { Authorization: `Bearer ${embedToken}` } : {},
  });
  if (response.status === 404) return { status: "notFound" };
  if (response.status === 401) return { status: "unauthorized" };
  if (!response.ok) throw new Error(`formkiln-server returned ${response.status} for form ${key}`);
  return { status: "ok", form: (await response.json()) as RuntimeForm };
}
