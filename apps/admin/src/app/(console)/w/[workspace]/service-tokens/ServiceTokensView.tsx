"use client";

import Add from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../components/ConfirmDialog";
import { CopyButton } from "../../../../../components/CopyButton";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../../../components/Notice";
import { PageHeader } from "../../../../../components/PageHeader";
import { api, errorMessage, type ServiceToken } from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";
import { useWorkspace } from "../../../../../lib/workspace";

const EXPIRY: { value: number | ""; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: "", label: "Never" },
];

function status(token: ServiceToken): { label: string; active: boolean } {
  if (token.revokedAt) return { label: "Revoked", active: false };
  if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
    return { label: "Expired", active: false };
  }
  return { label: "Active", active: true };
}

export function ServiceTokensView() {
  const ws = useWorkspace();
  const [tokens, setTokens] = useState<ServiceToken[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [expiry, setExpiry] = useState<number | "">(90);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setTokens(await api<ServiceToken[]>(`${ws.admin}/service-tokens`));
    } catch (failure) {
      setLoadError(errorMessage(failure));
    }
  }, [ws.admin]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setCreateError(null);
    try {
      const result = await api<{ token: string; details: ServiceToken }>(
        `${ws.admin}/service-tokens`,
        {
          method: "POST",
          body: { name, role, ...(expiry !== "" && { expiresInDays: expiry }) },
        },
      );
      setCreating(false);
      setCreated({ name: result.details.name, token: result.token });
      setName("");
      setRole("viewer");
      setExpiry(90);
      await load();
    } catch (failure) {
      setCreateError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const revoke = (token: ServiceToken) =>
    setConfirmation({
      title: `Revoke ${token.name}?`,
      text: "Requests with this token fail from now on. This cannot be undone; create a new token if you need one again.",
      action: "Revoke",
      danger: true,
      run: async () => {
        setBusy(true);
        try {
          await api(`${ws.admin}/service-tokens/${token.id}`, { method: "DELETE" });
          setNotice({ severity: "success", text: `${token.name} was revoked.` });
          await load();
        } catch (failure) {
          setNotice({ severity: "error", text: errorMessage(failure) });
        } finally {
          setBusy(false);
          setConfirmation(null);
        }
      },
    });

  if (loadError) return <Alert severity="error">{loadError}</Alert>;

  return (
    <>
      <PageHeader
        title="Service tokens"
        description={`Tokens let your own systems use the management API of ${ws.name}: publish forms, read submissions, issue embed tokens. Each token works in this workspace only, with its role.`}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreating(true)}
            disabled={ws.archived}
          >
            New token
          </Button>
        }
      />

      {tokens && tokens.length === 0 ? (
        <Typography color="text.secondary">No tokens yet.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Service tokens">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last used</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">
                  <VisuallyHidden>Actions</VisuallyHidden>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tokens ?? []).map((token) => {
                const state = status(token);
                return (
                  <TableRow key={token.id}>
                    <TableCell>{token.name}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>{token.role}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={state.label}
                        color={state.active ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <DateTime value={token.createdAt} />
                      {token.createdBy && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {token.createdBy}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {token.lastUsedAt ? <DateTime value={token.lastUsedAt} /> : "Never"}
                    </TableCell>
                    <TableCell>
                      {token.expiresAt ? <DateTime value={token.expiresAt} /> : "Never"}
                    </TableCell>
                    <TableCell align="right">
                      {state.active && (
                        <Button
                          size="small"
                          color="error"
                          disabled={busy || ws.archived}
                          onClick={() => revoke(token)}
                          aria-label={`Revoke ${token.name}`}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
          <DialogTitle>New service token</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                helperText="What uses it, for example “CRM sync”"
                autoFocus
                required
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                select
                label="Role"
                value={role}
                onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
                helperText={
                  role === "viewer"
                    ? "Reads forms and submissions, sensitive values masked"
                    : "Also publishes forms, reveals sensitive values and issues embed tokens"
                }
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
              </TextField>
              <TextField
                select
                label="Expires after"
                value={expiry}
                onChange={(event) =>
                  setExpiry(event.target.value === "" ? "" : Number(event.target.value))
                }
              >
                {EXPIRY.map((option) => (
                  <MenuItem key={option.label} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={created !== null} maxWidth="sm" fullWidth>
        <DialogTitle>Copy the token of {created?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              This is the only time the token is shown. Store it in your system&apos;s secret
              settings; anyone with it can act in this workspace with its role.
            </Alert>
            <Box
              component="code"
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                fontSize: 13,
                wordBreak: "break-all",
              }}
            >
              {created?.token}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Send it as <code>Authorization: Bearer &lt;token&gt;</code> to{" "}
              <code>/v1/manage/workspaces/{ws.slug}/…</code>.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          {created && <CopyButton text={created.token} label="Copy token" />}
          <Button variant="contained" onClick={() => setCreated(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
