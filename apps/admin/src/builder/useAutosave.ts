"use client";

import type { FormDocument } from "@formkiln/spec";
import { useEffect, useRef } from "react";
import { ApiError, api, type DefinitionError } from "../lib/api";
import { useBuilder } from "./store";
import { useWorkspace } from "../lib/workspace";

export const AUTOSAVE_DELAY_MS = 1500;

export interface SavedCopy {
  revision: number;
  problems: DefinitionError[];
  document: FormDocument;
  updatedAt: string | null;
  updatedBy: string | null;
  baseVersion: number | null;
  latestVersion: number | null;
}

/** Saves the document to the working copy after edits settle. Conflicts stop autosaving. */
export function useAutosave(formKey: string, enabled: boolean) {
  const { manage } = useWorkspace();
  const version = useBuilder((state) => state.version);
  const saveStatus = useBuilder((state) => state.saveStatus);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled || saveStatus === "conflict" || saveStatus === "saving" || version === 0) return;
    const state = useBuilder.getState();
    if (state.saveStatus === "saved") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(manage, formKey, inFlight), AUTOSAVE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [manage, formKey, enabled, version, saveStatus]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const status = useBuilder.getState().saveStatus;
      if (status === "dirty" || status === "saving" || status === "error" || status === "conflict")
        event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
}

/** Saves the current document now; resolves when done. */
export async function saveNow(
  manage: string,
  formKey: string,
  inFlight?: { current: boolean },
): Promise<boolean> {
  if (inFlight?.current) return false;
  if (inFlight) inFlight.current = true;
  const { document, revision, version, setSaveStatus, saved } = useBuilder.getState();
  setSaveStatus("saving");
  try {
    const copy = await api<SavedCopy>(`${manage}/forms/${formKey}/working-copy`, {
      method: "PUT",
      body: { revision, document },
    });
    saved(copy.revision, copy.problems, version);
    return true;
  } catch (failure) {
    setSaveStatus(
      failure instanceof ApiError && failure.code === "revisionConflict" ? "conflict" : "error",
    );
    return false;
  } finally {
    if (inFlight) inFlight.current = false;
  }
}
