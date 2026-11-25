import "server-only";
import type { FormDocument } from "@formkiln/spec";

/** Base URL of formkiln-server. Only the Next.js server talks to it. */
export const API_URL = (process.env.FORMKILN_API_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

export interface PublishedForm {
  key: string;
  version: number;
  publishedAt: string;
  definition: FormDocument;
}

const KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;

export function isFormKey(value: string): boolean {
  return KEY.test(value);
}

/** The latest published version of a form, or null when it does not exist. */
export async function getPublishedForm(key: string): Promise<PublishedForm | null> {
  if (!isFormKey(key)) return null;
  const response = await fetch(`${API_URL}/v1/forms/${key}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`formkiln-server returned ${response.status} for form ${key}`);
  return (await response.json()) as PublishedForm;
}
