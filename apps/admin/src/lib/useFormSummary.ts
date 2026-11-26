"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Folder, type FormSummary } from "./api";

/** A form's summary (active or archived) and its folder, for headers and banners. */
export function useFormSummary(formKey: string) {
  const [form, setForm] = useState<FormSummary | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);

  const reload = useCallback(async () => {
    try {
      const [active, archived, folders] = await Promise.all([
        api<FormSummary[]>("/v1/manage/forms"),
        api<FormSummary[]>("/v1/manage/forms?archived=true"),
        api<Folder[]>("/v1/manage/folders"),
      ]);
      const found = [...active, ...archived].find((f) => f.key === formKey) ?? null;
      setForm(found);
      setFolder(found?.folderId ? (folders.find((f) => f.id === found.folderId) ?? null) : null);
    } catch {
      // Only refines the header; the page shows its own errors.
    }
  }, [formKey]);
  useEffect(() => {
    void reload();
  }, [reload]);

  return { form, folder, reload };
}
