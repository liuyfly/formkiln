"use client";

import Add from "@mui/icons-material/Add";
import UploadFile from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../../../components/PageHeader";
import { PublishDialog } from "../../../components/PublishDialog";
import { useUser } from "../../../components/Shell";
import { api, canEdit, errorMessage, isFormKey, type FormSummary } from "../../../lib/api";
import { DateTime } from "../../../lib/format";

export function FormsView() {
  const user = useUser();
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setCreateError(null);
    try {
      await api("/v1/manage/forms", { method: "POST", body: { key: newKey, title: newTitle } });
      router.push(`/forms/${newKey}/edit`);
    } catch (failure) {
      setCreateError(errorMessage(failure));
      setBusy(false);
    }
  };

  /** A key suggestion from the title: "Rental application" → rentalApplication. */
  const suggestKey = (title: string) => {
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
  };

  useEffect(() => {
    api<FormSummary[]>("/v1/manage/forms").then(setForms, (failure) =>
      setError(errorMessage(failure)),
    );
  }, []);

  return (
    <>
      <PageHeader
        title="Forms"
        description="Published forms. Each publication is an immutable version."
        action={
          canEdit(user) && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<UploadFile />}
                onClick={() => setPublishing(true)}
              >
                Import JSON
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
                New form
              </Button>
            </Stack>
          )
        }
      />
      {error && <Alert severity="error">{error}</Alert>}
      {forms && forms.length === 0 && (
        <Typography color="text.secondary">
          No forms yet.{canEdit(user) && " Create one with New form, or import a form document."}
        </Typography>
      )}
      {forms && forms.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Forms">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell align="right">Version</TableCell>
                <TableCell>Published</TableCell>
                <TableCell>Access</TableCell>
                <TableCell align="right">Submissions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.key} hover>
                  <TableCell>
                    <Link
                      component={NextLink}
                      href={
                        form.latestVersion === null
                          ? `/forms/${form.key}/edit`
                          : `/forms/${form.key}`
                      }
                      sx={{ fontWeight: 500 }}
                    >
                      {form.key}
                    </Link>
                    {form.latestVersion === null ? (
                      <Chip size="small" label="Draft" sx={{ ml: 1 }} />
                    ) : (
                      form.unpublishedChanges && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="warning"
                          label="Unpublished changes"
                          sx={{ ml: 1 }}
                        />
                      )
                    )}
                  </TableCell>
                  <TableCell align="right">{form.latestVersion ?? "—"}</TableCell>
                  <TableCell>
                    <DateTime value={form.latestPublishedAt} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={form.accessMode === "public" ? "Public link" : "Embed token"}
                    />
                  </TableCell>
                  <TableCell align="right">{form.submissionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog
        open={creating}
        onClose={busy ? undefined : () => setCreating(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={create}>
          <DialogTitle>New form</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField
                label="Title"
                value={newTitle}
                onChange={(event) => {
                  const previousSuggestion = suggestKey(newTitle);
                  setNewTitle(event.target.value);
                  if (newKey === "" || newKey === previousSuggestion)
                    setNewKey(suggestKey(event.target.value));
                }}
                autoFocus
                required
              />
              <TextField
                label="Key"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                error={newKey !== "" && !isFormKey(newKey)}
                helperText="Used in links and the API; it cannot change later. A lowercase letter, then letters, digits or underscores."
                required
                slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !isFormKey(newKey) || !newTitle.trim()}
            >
              Create and edit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <PublishDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        onPublished={(key) => router.push(`/forms/${key}/versions`)}
      />
    </>
  );
}
