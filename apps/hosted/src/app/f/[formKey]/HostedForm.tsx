"use client";

import { KilnForm, SubmitError, type UploadFile } from "@formkiln/react";
import type { FormDocument, JsonValue } from "@formkiln/spec";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { hostedMessages } from "../../../lib/messages";
import { Turnstile } from "./Turnstile";

type Answers = Readonly<Record<string, JsonValue>>;

interface Props {
  form: FormDocument;
  version: number;
  locale: string;
  /** Embed token for token-mode forms; sent with every request. */
  embedToken: string | null;
  /** Keeps the drafts of different embedding users apart (the token's subject). */
  draftScope: string;
  captcha: { provider: string; siteKey: string } | null;
  /** Offer "email me a link to continue later". */
  resumeByEmail: boolean;
}

/** Delay between the last change and saving the draft. */
const SAVE_DELAY_MS = 1500;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); drafts are then not kept.
  }
}

/**
 * Renders a published form. Every request goes through this app's proxy routes: drafts are
 * saved as you type, files are uploaded when selected and the submission is re-validated by
 * formkiln-server.
 */
export function HostedForm({
  form,
  version,
  locale,
  embedToken,
  draftScope,
  captcha,
  resumeByEmail,
}: Props) {
  const messages = hostedMessages(locale);
  const base = `/f/${form.key}`;
  const storageKey = `formkiln:draft:${form.key}:${draftScope}`;
  const auth: Record<string, string> = embedToken ? { Authorization: `Bearer ${embedToken}` } : {};

  const [initialAnswers, setInitialAnswers] = useState<Answers | null>(null);
  const draftToken = useRef<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const submitted = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const captchaToken = useRef<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const latest = useRef<Answers>({});
  const [done, setDone] = useState(false);

  // The embed token is only needed in memory; keep it out of the address bar and history.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  // Restore the draft from a "continue later" link (#draft=<token>), else the one of this device.
  useEffect(() => {
    let cancelled = false;
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get("draft");
    if (fromLink) {
      // Keep the token out of the address bar and history.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
      if (/^[A-Za-z0-9_-]{16,128}$/.test(fromLink)) storageSet(storageKey, fromLink);
    }
    const token = storageGet(storageKey);
    if (!token) {
      setInitialAnswers({});
      return;
    }
    fetch(`${base}/drafts`, { headers: { ...auth, "Formkiln-Draft": token } })
      .then(async (response) => {
        if (cancelled) return;
        if (response.ok) {
          draftToken.current = token;
          const draft = (await response.json()) as { answers: Answers };
          latest.current = draft.answers ?? {};
          setInitialAnswers(draft.answers ?? {});
        } else {
          if (response.status === 404) storageSet(storageKey, null);
          setInitialAnswers({});
        }
      })
      .catch(() => !cancelled && setInitialAnswers({}));
    return () => {
      cancelled = true;
    };
    // Runs once per form and scope.
  }, [storageKey]);

  const save = useCallback(
    async (answers: Answers) => {
      if (submitted.current) return;
      const body = JSON.stringify({ answers });
      const headers = { ...auth, "Content-Type": "application/json" };
      if (draftToken.current) {
        const response = await fetch(`${base}/drafts`, {
          method: "PUT",
          headers: { ...headers, "Formkiln-Draft": draftToken.current },
          body,
        });
        if (response.status !== 404) return;
        draftToken.current = null; // Expired: start a new draft.
      }
      const response = await fetch(`${base}/drafts`, { method: "POST", headers, body });
      if (response.ok && !submitted.current) {
        const { token } = (await response.json()) as { token: string };
        draftToken.current = token;
        storageSet(storageKey, token);
      }
    },
    [base, storageKey, embedToken],
  );

  /** Saves the current answers now and resolves with the draft token. */
  const saveNow = async (): Promise<string | null> => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
    saving.current = saving.current.then(() => save(latest.current)).catch(() => undefined);
    await saving.current;
    return draftToken.current;
  };

  const onChange = (answers: Answers) => {
    latest.current = answers;
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = null;
      // Saves run one after another so a draft is created once.
      saving.current = saving.current.then(() => save(answers)).catch(() => undefined);
    }, SAVE_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  const uploadFile: UploadFile = async (file, { field }) => {
    const body = new FormData();
    body.append("field", field.key);
    body.append("file", file);
    const response = await fetch(`${base}/files`, { method: "POST", headers: auth, body });
    if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
    return response.json();
  };

  const beforeSubmit = (
    <>
      {/* Bots fill every input; people never see this one. */}
      <div className="hosted-honeypot" aria-hidden="true">
        <label>
          {messages.honeypotLabel}
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {captcha && (
        <Turnstile
          siteKey={captcha.siteKey}
          locale={locale}
          resetKey={captchaReset}
          onToken={(token) => {
            captchaToken.current = token;
          }}
        />
      )}
    </>
  );

  if (initialAnswers === null) return null;

  return (
    <>
      <KilnForm
        form={form}
        locale={locale}
        initialAnswers={initialAnswers}
        onChange={onChange}
        uploadFile={uploadFile}
        beforeSubmit={beforeSubmit}
        onSubmit={async ({ submission, outcome }) => {
          if (captcha && !captchaToken.current)
            throw new SubmitError(messages.verificationRequired);
          // Let a draft save in flight finish, so its token is known and deleted on submit.
          if (pending.current) clearTimeout(pending.current);
          pending.current = null;
          await saving.current;
          const response = await fetch(`${base}/submit`, {
            method: "POST",
            headers: { ...auth, "Content-Type": "application/json" },
            body: JSON.stringify({
              version,
              answers: submission,
              locale,
              draftToken: draftToken.current,
              captchaToken: captchaToken.current,
              honeypot: honeypot.current?.value ?? "",
            }),
          });
          if (!response.ok) {
            if (captcha) setCaptchaReset((n) => n + 1);
            const problem = (await response.json().catch(() => ({}))) as { code?: string };
            if (problem.code === "captchaFailed")
              throw new SubmitError(messages.verificationFailed);
            if (response.status === 401) throw new SubmitError(messages.sessionExpired);
            if (response.status === 429) throw new SubmitError(messages.tooManyRequests);
            // The server re-validates; any other rejection is reported as a failed submission.
            throw new Error(`Submission failed with status ${response.status}`);
          }
          submitted.current = true;
          setDone(true);
          draftToken.current = null;
          storageSet(storageKey, null);
          const redirect = form.submit?.outcomes?.find(
            (candidate) => candidate.key === outcome,
          )?.redirect;
          if (redirect) window.location.assign(redirect);
        }}
      />
      {resumeByEmail && !done && (
        <ResumeByEmail base={base} auth={auth} locale={locale} saveNow={saveNow} />
      )}
    </>
  );
}

/** "Email me a link to continue later": saves the draft, then asks the server to email the link. */
function ResumeByEmail({
  base,
  auth,
  locale,
  saveNow,
}: {
  base: string;
  auth: Record<string, string>;
  locale: string;
  saveNow: () => Promise<string | null>;
}) {
  const messages = hostedMessages(locale);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const token = await saveNow();
      if (!token) throw new Error("No draft");
      const response = await fetch(`${base}/drafts/resume-link`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", "Formkiln-Draft": token },
        body: JSON.stringify({ email, locale }),
      });
      if (response.status === 429) setStatus({ ok: false, text: messages.resumeTooMany });
      else if (!response.ok) setStatus({ ok: false, text: messages.resumeFailed });
      else {
        setStatus({ ok: true, text: messages.resumeSent });
        setOpen(false);
      }
    } catch {
      setStatus({ ok: false, text: messages.resumeFailed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hosted-resume">
      {open ? (
        <form onSubmit={send} className="hosted-resume-form" aria-labelledby="hosted-resume-title">
          <p id="hosted-resume-title" className="hosted-resume-title">
            {messages.resumeTitle}
          </p>
          <p className="hosted-resume-hint">{messages.resumeHint}</p>
          <label className="hosted-resume-label">
            {messages.resumeEmail}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="hosted-resume-input"
            />
          </label>
          <div className="hosted-resume-actions">
            <button type="submit" className="fk-button fk-button-primary" disabled={busy}>
              {messages.resumeSend}
            </button>
            <button
              type="button"
              className="fk-button fk-button-secondary"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {messages.resumeCancel}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="hosted-resume-link"
          onClick={() => {
            setOpen(true);
            setStatus(null);
          }}
        >
          {messages.resumeOffer}
        </button>
      )}
      <p
        role="status"
        className={status?.ok === false ? "hosted-resume-status error" : "hosted-resume-status"}
      >
        {status?.text}
      </p>
    </div>
  );
}
