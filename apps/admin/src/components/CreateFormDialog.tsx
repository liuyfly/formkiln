"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { TEMPLATES } from "../builder/templates";
import { api, errorMessage, isFormKey } from "../lib/api";
import { useWorkspace } from "../lib/workspace";

/** A key suggestion from a title: "Rental application" → rentalApplication. */
export function suggestKey(title: string): string {
  const words = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const key = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
  return /^[a-z]/.test(key) ? key.slice(0, 64) : "";
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Duplicate this form (its current working copy) instead of offering templates. */
  duplicateOf?: string;
  /** Create the form in this folder. */
  folderId?: string | null;
}

/** Creates a form: blank, from a template, or as a copy of another form; then opens the builder. */
export function CreateFormDialog({ open, onClose, duplicateOf, folderId }: Props) {
  const ws = useWorkspace();
  const router = useRouter();
  const [template, setTemplate] = useState("blank");
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTemplate("blank");
    setTitle("");
    setKey(duplicateOf ? `${duplicateOf}Copy`.slice(0, 64) : "");
    setError(null);
    setBusy(false);
  }, [open, duplicateOf]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let document: FormDocument | undefined;
      let source: string | undefined;
      if (duplicateOf) {
        document = (
          await api<{ document: FormDocument }>(`${ws.manage}/forms/${duplicateOf}/working-copy`)
        ).document;
        source = `form:${duplicateOf}`;
      } else if (template !== "blank") {
        document = TEMPLATES.find((t) => t.id === template)?.document;
        source = `template:${template}`;
      }
      await api(`${ws.manage}/forms`, {
        method: "POST",
        body: {
          key,
          ...(title.trim() && { title: title.trim() }),
          ...(document && { document, source }),
        },
      });
      if (folderId) {
        await api(`${ws.manage}/forms/${key}/folder`, { method: "PUT", body: { folderId } });
      }
      router.push(ws.href(`/forms/${key}/edit`));
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };

  const titleRequired = !duplicateOf && template === "blank";
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{duplicateOf ? `Duplicate ${duplicateOf}` : "New form"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {duplicateOf ? (
              <Typography variant="body2" color="text.secondary">
                The copy starts with the form as it is in the builder now (including unpublished
                changes). Submissions, sharing settings and webhooks are not copied.
              </Typography>
            ) : (
              <RadioGroup
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                aria-label="Start from"
              >
                <FormControlLabel
                  value="blank"
                  control={<Radio />}
                  label={<strong>Blank form</strong>}
                />
                {TEMPLATES.map((t) => (
                  <FormControlLabel
                    key={t.id}
                    value={t.id}
                    control={<Radio />}
                    label={
                      <Box>
                        <strong>{t.name}</strong>
                        <Typography variant="body2" color="text.secondary">
                          {t.description}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", "& .MuiRadio-root": { pt: 0.5 } }}
                  />
                ))}
              </RadioGroup>
            )}
            <TextField
              label="Title"
              value={title}
              onChange={(event) => {
                const previous = suggestKey(title);
                setTitle(event.target.value);
                if (key === "" || key === previous) setKey(suggestKey(event.target.value));
              }}
              helperText={titleRequired ? undefined : "Leave empty to keep the current title."}
              required={titleRequired}
            />
            <TextField
              label="Key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              error={key !== "" && !isFormKey(key)}
              helperText="Used in links and the API; it cannot change later. A lowercase letter, then letters, digits or underscores."
              required
              slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !isFormKey(key) || (titleRequired && !title.trim())}
          >
            {duplicateOf ? "Duplicate and edit" : "Create and edit"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
