"use client";

import UploadFile from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type ChangeEvent } from "react";
import { ApiError, api, errorMessage, isFormKey, type DefinitionError } from "../lib/api";

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

interface Props {
  open: boolean;
  /** Publishing a new version of this form; when absent the key comes from the document. */
  formKey?: string;
  onClose: () => void;
  onPublished: (key: string, version: number) => void;
}

/** Publishes a form document (Form Schema v1 JSON) as a new immutable version. */
export function PublishDialog({ open, formKey, onClose, onPublished }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<DefinitionError[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setText("");
    setError(null);
    setProblems([]);
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("The file is larger than 2 MB.");
      return;
    }
    setText(await file.text());
    setError(null);
    setProblems([]);
  };

  const publish = async () => {
    setError(null);
    setProblems([]);
    let document: unknown;
    try {
      document = JSON.parse(text);
    } catch {
      setError("This is not valid JSON.");
      return;
    }
    const key =
      formKey ??
      (document && typeof document === "object" ? (document as { key?: unknown }).key : undefined);
    if (typeof key !== "string" || !isFormKey(key)) {
      setError('The document needs a "key": a letter followed by letters, digits or underscores.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ version: number }>(`/v1/manage/forms/${key}/versions`, {
        method: "POST",
        body: document,
      });
      reset();
      onPublished(key, result.version);
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiError) setProblems(failure.errors as DefinitionError[]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {formKey ? `Publish a new version of ${formKey}` : "Publish a form"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Upload or paste a Form Schema v1 document. Every publication is a new, immutable
            version; new submissions use the latest one.
          </Typography>
          <div>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}>
              Choose JSON file
              <input type="file" accept="application/json,.json" hidden onChange={readFile} />
            </Button>
          </div>
          <TextField
            label="Form document (JSON)"
            multiline
            minRows={10}
            maxRows={20}
            value={text}
            onChange={(event) => setText(event.target.value)}
            slotProps={{
              htmlInput: { spellCheck: false, style: { fontFamily: "monospace", fontSize: 13 } },
            }}
          />
          {error && (
            <Alert severity="error">
              {error}
              {problems.length > 0 && (
                <Box
                  component="ul"
                  sx={{ m: 0, mt: 1, pl: 2, fontFamily: "monospace", fontSize: 13 }}
                >
                  {problems.slice(0, 50).map((problem, index) => (
                    <li key={index}>
                      {problem.pointer || "/"}: {problem.code}
                    </li>
                  ))}
                </Box>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void publish()} disabled={busy || !text.trim()}>
          Publish
        </Button>
      </DialogActions>
    </Dialog>
  );
}
