"use client";

import { KilnForm } from "@formkiln/react";
import type { FormDocument } from "@formkiln/spec";

interface Props {
  form: FormDocument;
  version: number;
  locale: string;
}

/** Renders a published form and sends the submission through this app's proxy route. */
export function HostedForm({ form, version, locale }: Props) {
  return (
    <KilnForm
      form={form}
      locale={locale}
      onSubmit={async ({ submission, outcome }) => {
        const response = await fetch(`/f/${form.key}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version, answers: submission, locale }),
        });
        if (!response.ok) {
          // The server re-validates; a rejection here is reported as a failed submission.
          throw new Error(`Submission failed with status ${response.status}`);
        }
        const redirect = form.submit?.outcomes?.find(
          (candidate) => candidate.key === outcome,
        )?.redirect;
        if (redirect) window.location.assign(redirect);
      }}
    />
  );
}
