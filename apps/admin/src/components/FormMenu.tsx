"use client";

import Archive from "@mui/icons-material/ArchiveOutlined";
import DriveFileMove from "@mui/icons-material/DriveFileMoveOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { api, canEdit, errorMessage, isAdmin } from "../lib/api";
import { ConfirmDialog, type Confirmation } from "./ConfirmDialog";
import { MoveFormDialog } from "./FolderDialogs";
import { useUser } from "./Shell";

/** The text of the archive confirmation: what happens, and that nothing is lost. */
export function archiveConfirmation(formKey: string, run: () => Promise<void>): Confirmation {
  return {
    title: `Archive ${formKey}?`,
    text:
      "The form leaves the form list and its links stop working: respondents can no longer open or submit it. " +
      "Its submissions, versions and settings are kept, and an admin can restore it from Archived forms.",
    action: "Archive",
    danger: true,
    run,
  };
}

/**
 * Actions on one form: move it to a folder (editors) and archive it (admins). Renders nothing for
 * members who can do neither.
 */
export function FormMenu({
  formKey,
  folderId,
  onMoved,
  onArchived,
  onError,
}: {
  formKey: string;
  folderId: string | null;
  onMoved: (folderId: string | null) => void;
  onArchived: () => void;
  onError: (message: string) => void;
}) {
  const user = useUser();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [moving, setMoving] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canEdit(user) && !isAdmin(user)) return null;

  const archive = () =>
    setConfirmation(
      archiveConfirmation(formKey, async () => {
        setBusy(true);
        try {
          await api(`/v1/manage/forms/${formKey}/archive`, { method: "POST" });
          setConfirmation(null);
          onArchived();
        } catch (failure) {
          setConfirmation(null);
          onError(errorMessage(failure));
        } finally {
          setBusy(false);
        }
      }),
    );

  return (
    <>
      <IconButton
        aria-label={`Actions for ${formKey}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVert />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        {canEdit(user) && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              setMoving(true);
            }}
          >
            <ListItemIcon>
              <DriveFileMove fontSize="small" />
            </ListItemIcon>
            <ListItemText>Move to folder…</ListItemText>
          </MenuItem>
        )}
        {isAdmin(user) && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              archive();
            }}
          >
            <ListItemIcon>
              <Archive fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
      </Menu>
      <MoveFormDialog
        formKey={moving ? formKey : null}
        folderId={folderId}
        onClose={() => setMoving(false)}
        onMoved={onMoved}
      />
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
