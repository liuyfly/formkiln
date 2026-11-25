"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export interface Confirmation {
  title: string;
  text: string;
  action: string;
  danger?: boolean;
  run: () => Promise<void>;
}

export function ConfirmDialog({
  confirmation,
  busy,
  onClose,
}: {
  confirmation: Confirmation | null;
  busy: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={confirmation !== null}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      {confirmation && (
        <>
          <DialogTitle>{confirmation.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirmation.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={confirmation.danger ? "error" : "primary"}
              disabled={busy}
              onClick={() => void confirmation.run()}
            >
              {confirmation.action}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
