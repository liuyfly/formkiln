"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { api, errorMessage, type DefinitionError } from "../lib/api";
import { problemText } from "./catalog";
import { useBuilder } from "./store";
import { saveNow } from "./useAutosave";

interface Change {
  kind: "fieldRemoved" | "typeChanged" | "optionsRemoved";
  path: string;
  detail: { from?: string; to?: string; values?: string[] };
}

function describe(change: Change): string {
  switch (change.kind) {
    case "fieldRemoved":
      return `“${change.path}” is removed. Existing answers stay in old submissions but are no longer collected.`;
    case "typeChanged":
      return `“${change.path}” changes from ${change.detail.from} to ${change.detail.to}. Integrations reading it may break.`;
    case "optionsRemoved":
      return `“${change.path}” no longer offers ${change.detail.values?.join(", ")}.`;
  }
}

/** Saves, checks and publishes the working copy as a new version. */
export function PublishDialog({
  formKey,
  open,
  onClose,
  onPublished,
}: {
  formKey: string;
  open: boolean;
  onClose: () => void;
  onPublished: (version: number) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [problems, setProblems] = useState<DefinitionError[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setChecking(true);
    setError(null);
    setAcknowledged(false);
    (async () => {
      // Publish what is on screen: save pending edits first.
      if (useBuilder.getState().saveStatus !== "saved" && !(await saveNow(formKey))) {
        if (!cancelled) setError("The latest changes could not be saved. Resolve that first.");
        return;
      }
      const result = await api<{ problems: DefinitionError[]; changes: Change[] }>(
        `/v1/manage/forms/${formKey}/working-copy/check`,
      );
      if (cancelled) return;
      setProblems(result.problems);
      setChanges(result.changes);
    })()
      .catch((failure) => !cancelled && setError(errorMessage(failure)))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [open, formKey]);

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ version: number }>(
        `/v1/manage/forms/${formKey}/working-copy/publish`,
        {
          method: "POST",
          body: { revision: useBuilder.getState().revision, acknowledgeChanges: acknowledged },
        },
      );
      onPublished(result.version);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const blocked = checking || problems.length > 0 || (changes.length > 0 && !acknowledged);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Publish a new version</DialogTitle>
      <DialogContent>
        {checking ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress aria-label="Checking" />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {problems.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Fix these problems before publishing:
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                  {problems.slice(0, 20).map((problem, index) => (
                    <li key={index}>
                      {problemText(problem.code)} <code>{problem.pointer}</code>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
            {problems.length === 0 && changes.length === 0 && !error && (
              <Typography>
                New submissions will use the new version. Existing submissions keep the version they
                were made with.
              </Typography>
            )}
            {problems.length === 0 && changes.length > 0 && (
              <>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  This version changes fields that existing submissions and integrations use:
                  <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                    {changes.map((change, index) => (
                      <li key={index}>{describe(change)}</li>
                    ))}
                  </Box>
                </Alert>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                    />
                  }
                  label="I understand these changes"
                />
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void publish()} disabled={busy || blocked}>
          Publish
        </Button>
      </DialogActions>
    </Dialog>
  );
}
