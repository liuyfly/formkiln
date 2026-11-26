"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, type Folder } from "../lib/api";

/** Creates a folder, or renames `folder`. */
export function FolderNameDialog({
  open,
  folder,
  onClose,
  onSaved,
}: {
  open: boolean;
  folder?: Folder | null;
  onClose: () => void;
  onSaved: (folder: Folder) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? "");
    setError(null);
  }, [open, folder]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Folder>(
        folder ? `/v1/manage/folders/${folder.id}` : "/v1/manage/folders",
        {
          method: folder ? "PATCH" : "POST",
          body: { name },
        },
      );
      onSaved(saved);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{folder ? "Rename folder" : "New folder"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
            {folder ? "Rename" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Moves a form into a folder, or to the top level. */
export function MoveFormDialog({
  formKey,
  folderId,
  onClose,
  onMoved,
}: {
  /** The form to move; the dialog is open while it is set. */
  formKey: string | null;
  folderId: string | null;
  onClose: () => void;
  onMoved: (folderId: string | null) => void;
}) {
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (formKey === null) return;
    setTarget(folderId ?? "");
    setError(null);
    api<Folder[]>("/v1/manage/folders").then(setFolders, (failure) =>
      setError(errorMessage(failure)),
    );
  }, [formKey, folderId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (formKey === null) return;
    setBusy(true);
    setError(null);
    try {
      const next = target === "" ? null : target;
      await api(`/v1/manage/forms/${formKey}/folder`, { method: "PUT", body: { folderId: next } });
      onMoved(next);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={formKey !== null} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>Move {formKey}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            select
            fullWidth
            label="Folder"
            value={folders ? target : ""}
            onChange={(event) => setTarget(event.target.value)}
            disabled={!folders}
            helperText={
              folders?.length === 0 ? "No folders yet: create one on the forms page." : undefined
            }
            sx={{ mt: 1 }}
          >
            <MenuItem value="">No folder (top level)</MenuItem>
            {folders?.map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>
                {folder.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !folders || target === (folderId ?? "")}
          >
            Move
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
