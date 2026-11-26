"use client";

import Add from "@mui/icons-material/Add";
import CreateNewFolder from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import Edit from "@mui/icons-material/EditOutlined";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import UploadFile from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../components/ConfirmDialog";
import { CreateFormDialog } from "../../../../../components/CreateFormDialog";
import { FolderNameDialog } from "../../../../../components/FolderDialogs";
import { FormMenu } from "../../../../../components/FormMenu";
import { PageHeader } from "../../../../../components/PageHeader";
import { PublishDialog } from "../../../../../components/PublishDialog";
import {
  api,
  canEdit,
  errorMessage,
  isAdmin,
  type Folder,
  type FormSummary,
} from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";
import { useWorkspace } from "../../../../../lib/workspace";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Rename and delete for one folder row. */
function FolderMenu({
  folder,
  onRename,
  onDelete,
}: {
  folder: Folder;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        aria-label={`Actions for folder ${folder.name}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVert />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onRename();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={folder.formCount > 0}
          onClick={() => {
            setAnchor(null);
            onDelete();
          }}
        >
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Delete"
            secondary={folder.formCount > 0 ? "Move its forms out first" : undefined}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

export function FormsView() {
  const ws = useWorkspace();
  const editor = canEdit(ws);
  const admin = isAdmin(ws);
  const router = useRouter();
  const params = useSearchParams();
  const folderId = params.get("folder");
  const archived = params.get("view") === "archived";

  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [naming, setNaming] = useState<{ folder: Folder | null } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);

  const [foldersUnavailable, setFoldersUnavailable] = useState(false);
  const load = useCallback(() => {
    setError(null);
    api<FormSummary[]>(`${ws.manage}/forms?archived=${archived}`).then(setForms, (failure) =>
      setError(errorMessage(failure)),
    );
    // The forms stay usable without folders (for example against a server that has none yet).
    api<Folder[]>(`${ws.manage}/folders`).then(
      (list) => {
        setFolders(list);
        setFoldersUnavailable(false);
      },
      () => {
        setFolders([]);
        setFoldersUnavailable(true);
      },
    );
  }, [archived]);
  useEffect(load, [load]);

  const folder = folderId ? (folders?.find((f) => f.id === folderId) ?? null) : null;
  const known = new Set(folders?.map((f) => f.id));
  // Archived forms are listed together; active ones by folder (top level: no folder).
  const shown =
    forms?.filter((form) =>
      archived
        ? true
        : folderId
          ? form.folderId === folderId
          : form.folderId === null || !known.has(form.folderId),
    ) ?? null;
  const folderRows = !archived && !folderId ? (folders ?? []) : [];

  const run = (action: () => Promise<void>, done: string) => async () => {
    setBusy(true);
    try {
      await action();
      setNotice(done);
      load();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  const deleteFolder = (target: Folder) =>
    setConfirmation({
      title: `Delete folder ${target.name}?`,
      text: "The folder is empty. Deleting it does not change any form.",
      action: "Delete",
      danger: true,
      run: run(async () => {
        await api(`${ws.manage}/folders/${target.id}`, { method: "DELETE" });
        if (folderId === target.id) router.push(ws.href("/forms"));
      }, `Deleted folder ${target.name}.`),
    });

  const restore = (key: string) =>
    setConfirmation({
      title: `Restore ${key}?`,
      text: "The form returns to the form list and its links work again.",
      action: "Restore",
      run: run(
        () => api(`${ws.manage}/forms/${key}/restore`, { method: "POST" }),
        `Restored ${key}.`,
      ),
    });

  const empty = shown !== null && shown.length === 0 && folderRows.length === 0;

  return (
    <>
      {folderId && (
        <Breadcrumbs aria-label="Folder" sx={{ mb: 0.5 }}>
          <Link component={NextLink} href={ws.href("/forms")} underline="hover" variant="body2">
            Forms
          </Link>
          <Typography variant="body2" color="text.primary">
            {folder?.name ?? "Folder"}
          </Typography>
        </Breadcrumbs>
      )}
      <PageHeader
        title={archived ? "Archived forms" : (folder?.name ?? (folderId ? "Folder" : "Forms"))}
        description={
          archived
            ? "Hidden from the form list and not served to respondents. Their submissions are kept."
            : "Published forms. Each publication is an immutable version."
        }
        action={
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={archived ? "archived" : "active"}
              aria-label="Forms shown"
              onChange={(_, value: string | null) =>
                value &&
                router.push(ws.href(value === "archived" ? "/forms?view=archived" : "/forms"))
              }
            >
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="archived">Archived</ToggleButton>
            </ToggleButtonGroup>
            {editor && !archived && (
              <>
                {!folderId && (
                  <Button
                    variant="outlined"
                    startIcon={<CreateNewFolder />}
                    onClick={() => setNaming({ folder: null })}
                  >
                    New folder
                  </Button>
                )}
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
              </>
            )}
          </Stack>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {foldersUnavailable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Folders could not be loaded; all forms are listed at the top level.
        </Alert>
      )}
      {folderId && folders && !folder && !foldersUnavailable && (
        <Alert severity="warning">This folder does not exist any more.</Alert>
      )}
      {empty && (
        <Typography color="text.secondary">
          {archived
            ? "No archived forms."
            : folderId
              ? "This folder is empty. Move forms here with the ⋮ menu of a form."
              : `No forms yet.${editor ? " Create one with New form, or import a form document." : ""}`}
        </Typography>
      )}
      {shown && !empty && (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label={archived ? "Archived forms" : "Forms"}>
            <TableHead>
              <TableRow>
                <TableCell>Form</TableCell>
                <TableCell align="right">Version</TableCell>
                <TableCell>{archived ? "Archived" : "Published"}</TableCell>
                <TableCell>Access</TableCell>
                <TableCell align="right">Submissions</TableCell>
                <TableCell padding="checkbox">
                  <Box
                    component="span"
                    sx={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                      clip: "rect(0 0 0 0)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Actions
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {folderRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell colSpan={5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <FolderIcon fontSize="small" color="action" />
                      <Link
                        component={NextLink}
                        href={ws.href(`/forms?folder=${row.id}`)}
                        sx={{ fontWeight: 500 }}
                      >
                        {row.name}
                      </Link>
                      <Typography variant="body2" color="text.secondary">
                        {plural(row.formCount, "form")}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell padding="checkbox">
                    {editor && (
                      <FolderMenu
                        folder={row}
                        onRename={() => setNaming({ folder: row })}
                        onDelete={() => deleteFolder(row)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {shown.map((form) => (
                <TableRow key={form.key} hover>
                  <TableCell>
                    <Link
                      component={NextLink}
                      href={
                        form.latestVersion === null && !archived
                          ? ws.href(`/forms/${form.key}/edit`)
                          : ws.href(`/forms/${form.key}`)
                      }
                      sx={{ fontWeight: 500 }}
                    >
                      {form.title || form.key}
                    </Link>
                    {form.latestVersion === null ? (
                      <Chip size="small" label="Draft" sx={{ ml: 1 }} />
                    ) : (
                      form.unpublishedChanges &&
                      !archived && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="warning"
                          label="Unpublished changes"
                          sx={{ ml: 1 }}
                        />
                      )
                    )}
                    {form.title && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {form.key}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{form.latestVersion ?? "—"}</TableCell>
                  <TableCell>
                    <DateTime value={archived ? form.archivedAt : form.latestPublishedAt} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={form.accessMode === "public" ? "Public link" : "Embed token"}
                    />
                  </TableCell>
                  <TableCell align="right">{form.submissionCount}</TableCell>
                  <TableCell padding="checkbox">
                    {archived ? (
                      admin && (
                        <Button size="small" onClick={() => restore(form.key)}>
                          Restore
                        </Button>
                      )
                    ) : (
                      <FormMenu
                        formKey={form.key}
                        folderId={form.folderId}
                        onMoved={() => {
                          setNotice(`Moved ${form.key}.`);
                          load();
                        }}
                        onArchived={() => {
                          setNotice(`Archived ${form.key}. Find it under Archived.`);
                          load();
                        }}
                        onError={setError}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <CreateFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        folderId={folder?.id ?? null}
      />
      <PublishDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        onPublished={(key) => router.push(ws.href(`/forms/${key}/versions`))}
      />
      <FolderNameDialog
        open={naming !== null}
        folder={naming?.folder ?? null}
        onClose={() => setNaming(null)}
        onSaved={(saved) => {
          setNotice(
            naming?.folder ? `Renamed the folder to ${saved.name}.` : `Created ${saved.name}.`,
          );
          load();
        }}
      />
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
