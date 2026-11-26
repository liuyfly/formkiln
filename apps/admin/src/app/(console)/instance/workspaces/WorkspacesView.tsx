"use client";

import Add from "@mui/icons-material/Add";
import MoreVert from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../components/ConfirmDialog";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../../components/Notice";
import { PageHeader } from "../../../../components/PageHeader";
import { api, errorMessage, isSlug, type WorkspaceSummary } from "../../../../lib/api";
import { DateTime } from "../../../../lib/format";

const BASE = "/v1/admin/instance/workspaces";

/** A slug suggested from a name: lower-case words joined by hyphens. */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
}

/** The name dialog: a new workspace (name and slug) or a new name for an existing one. */
function WorkspaceDialog({
  workspace,
  open,
  onClose,
  onSaved,
}: {
  workspace: WorkspaceSummary | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(workspace?.name ?? "");
    setSlug(workspace?.slug ?? "");
    setSlugEdited(false);
    setError(null);
  }, [open, workspace]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (workspace) {
        await api(`${BASE}/${workspace.slug}`, { method: "PATCH", body: { name } });
        await onSaved(`The workspace is now called ${name.trim()}.`);
      } else {
        await api(BASE, { method: "POST", body: { slug, name } });
        await onSaved(`Workspace ${name.trim()} was created. Add its first admin next.`);
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const slugInvalid = !workspace && slug !== "" && !isSlug(slug);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{workspace ? "Rename workspace" : "New workspace"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!workspace && !slugEdited) setSlug(slugFromName(event.target.value));
              }}
              autoFocus
              required
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            {!workspace && (
              <TextField
                label="Address"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugEdited(true);
                }}
                required
                error={slugInvalid}
                helperText={
                  slugInvalid
                    ? "Use lower-case letters, digits and hyphens (2 to 48), starting and ending with a letter or digit."
                    : `Part of every link, for example /f/${slug || "address"}/<form>. It cannot be changed later.`
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy || slugInvalid}>
            {workspace ? "Rename" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function WorkspacesView() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; workspace: WorkspaceSummary } | null>(
    null,
  );
  const [dialog, setDialog] = useState<{ workspace: WorkspaceSummary | null } | null>(null);

  const load = useCallback(async () => {
    try {
      setWorkspaces(await api<WorkspaceSummary[]>(BASE));
    } catch (failure) {
      setLoadError(errorMessage(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setArchived = async (workspace: WorkspaceSummary, archived: boolean) => {
    setBusy(true);
    try {
      await api(`${BASE}/${workspace.slug}`, { method: "PATCH", body: { archived } });
      setNotice({
        severity: "success",
        text: archived ? `${workspace.name} was archived.` : `${workspace.name} was restored.`,
      });
      await load();
      router.refresh(); // The switcher lists workspaces with their archived state.
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  if (loadError) return <Alert severity="error">{loadError}</Alert>;

  return (
    <>
      <PageHeader
        title="Workspaces"
        description="Each team works in its own workspace: its forms, submissions, members and audit log are kept apart. You manage workspaces and their members here; you see a workspace's forms only as its member."
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialog({ workspace: null })}
          >
            New workspace
          </Button>
        }
      />

      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Workspaces">
          <TableHead>
            <TableRow>
              <TableCell>Workspace</TableCell>
              <TableCell align="right">Members</TableCell>
              <TableCell align="right">Forms</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">
                <VisuallyHidden>Actions</VisuallyHidden>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(workspaces ?? []).map((workspace) => (
              <TableRow key={workspace.slug}>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <span>{workspace.name}</span>
                    {workspace.archivedAt && <Chip size="small" label="Archived" />}
                  </Stack>
                  <Typography component="code" variant="caption" color="text.secondary">
                    {workspace.slug}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Link
                    component={NextLink}
                    href={`/w/${workspace.slug}/members`}
                    underline="hover"
                    aria-label={`Members of ${workspace.name}: ${workspace.members}`}
                  >
                    {workspace.members}
                  </Link>
                </TableCell>
                <TableCell align="right">{workspace.forms}</TableCell>
                <TableCell>
                  <DateTime value={workspace.createdAt} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label={`Actions for ${workspace.name}`}
                    onClick={(event) => setMenu({ anchor: event.currentTarget, workspace })}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
        {menu && (
          <MenuItem
            component={NextLink}
            href={`/w/${menu.workspace.slug}/members`}
            onClick={() => setMenu(null)}
          >
            Members
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            component={NextLink}
            href={`/w/${menu.workspace.slug}/audit`}
            onClick={() => setMenu(null)}
          >
            Audit log
          </MenuItem>
        )}
        {menu && (
          <MenuItem
            onClick={() => {
              setDialog({ workspace: menu.workspace });
              setMenu(null);
            }}
          >
            Rename
          </MenuItem>
        )}
        {menu && !menu.workspace.archivedAt && (
          <MenuItem
            onClick={() => {
              const workspace = menu.workspace;
              setMenu(null);
              setConfirmation({
                title: `Archive ${workspace.name}?`,
                text: "Its forms stop accepting submissions and its members can only read. Nothing is deleted, and you can restore it later.",
                action: "Archive",
                danger: true,
                run: () => setArchived(workspace, true),
              });
            }}
          >
            Archive
          </MenuItem>
        )}
        {menu && menu.workspace.archivedAt && (
          <MenuItem
            onClick={() => {
              const workspace = menu.workspace;
              setMenu(null);
              void setArchived(workspace, false);
            }}
            disabled={busy}
          >
            Restore
          </MenuItem>
        )}
      </Menu>

      <WorkspaceDialog
        workspace={dialog?.workspace ?? null}
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onSaved={async (message) => {
          setDialog(null);
          setNotice({ severity: "success", text: message });
          await load();
          router.refresh();
        }}
      />
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
