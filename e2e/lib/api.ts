import { readFileSync } from "node:fs";
import { API_URL, MAILPIT_URL, SERVICE_TOKEN } from "./env";

export function readForm(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;
}

/** Publishes a form version with the service token. */
export async function publish(form: Record<string, unknown>): Promise<void> {
  const response = await fetch(
    `${API_URL}/v1/manage/workspaces/default/forms/${String(form.key)}/versions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    },
  );
  if (response.status !== 201) {
    throw new Error(
      `Publishing ${String(form.key)} failed: ${response.status} ${await response.text()}`,
    );
  }
}

/** Submits answers through the public runtime API. */
export async function submit(key: string, answers: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_URL}/v1/w/default/forms/${key}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (response.status !== 201) {
    throw new Error(`Submitting to ${key} failed: ${response.status} ${await response.text()}`);
  }
}

interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

/** The newest email to `to` whose text matches `pattern`, waiting for it to arrive. */
export async function waitForMail(
  to: string,
  pattern: RegExp,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`)).json()) as {
      messages: MailSummary[];
    };
    for (const message of list.messages) {
      if (!message.To.some((recipient) => recipient.Address === to)) continue;
      const detail = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
      ).json()) as {
        Text: string;
      };
      const match = detail.Text.match(pattern);
      if (match) return match[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email to ${to} matching ${pattern} within ${timeoutMs} ms`);
}
