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
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../components/ConfirmDialog";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../../../components/Notice";
import { PageHeader } from "../../../../../components/PageHeader";
import { useUser } from "../../../../../components/Shell";
import {
  api,
  errorMessage,
  type AddMemberResult,
  type Invitation,
  type Member,
  type Role,
} from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";
import { useWorkspace } from "../../../../../lib/workspace";

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Reads forms and submissions (sensitive values masked)",
  },
  {
    value: "editor",
    label: "Editor",
    description: "Also publishes forms, reveals sensitive values, manages sharing and webhooks",
  },
  { value: "admin", label: "Admin", description: "Also manages members and reads the audit log" },
];

function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value as Role)}
      disabled={disabled ?? false}
      slotProps={{ htmlInput: { "aria-label": label } }}
      sx={{ minWidth: 120 }}
      fullWidth={false}
    >
      {ROLES.map((role) => (
        <MenuItem key={role.value} value={role.value}>
          {role.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function MembersView() {
  const ws = useWorkspace();
  const me = useUser();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; member: Member } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        api<Member[]>(`${ws.admin}/members`),
        api<Invitation[]>(`${ws.admin}/invitations`),
      ]);
      setMembers(m);
      setInvitations(i);
    } catch (failure) {
      setLoadError(errorMessage(failure));
    }
  }, [ws.admin]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs an action, reports the outcome and reloads the lists. */
  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      setNotice({ severity: "success", text: success });
      await load();
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  const changeRole = (member: Member, role: Role) =>
    act(
      () => api(`${ws.admin}/members/${member.id}`, { method: "PATCH", body: { role } }),
      `${member.email} is now ${role}.`,
    );

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setInviteError(null);
    try {
      const added = await api<AddMemberResult>(`${ws.admin}/members`, {
        method: "POST",
        body: { email: inviteEmail, role: inviteRole },
      });
      setInviting(false);
      setNotice({
        severity: "success",
        text:
          added.result === "added"
            ? `${inviteEmail} already had an account and was added to ${ws.name}.`
            : `Invitation sent to ${inviteEmail}.`,
      });
      setInviteEmail("");
      setInviteRole("viewer");
      await load();
    } catch (failure) {
      setInviteError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <Alert severity="error">{loadError}</Alert>;

  return (
    <>
      <PageHeader
        title="Members"
        description={`Who can work in ${ws.name}. People without an account are invited by email; they sign in with a password and an authenticator app.`}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setInviting(true)}
            disabled={ws.archived}
          >
            Add member
          </Button>
        }
      />

      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Members">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last sign-in</TableCell>
              <TableCell align="right">
                <VisuallyHidden>Actions</VisuallyHidden>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(members ?? []).map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.email}
                  {member.id === me.id && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      (you)
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <RoleSelect
                    value={member.role}
                    label={`Role of ${member.email}`}
                    disabled={busy || ws.archived || member.status !== "active"}
                    onChange={(role) => void changeRole(member, role)}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={member.status === "active" ? "Active" : "Disabled"}
                    color={member.status === "active" ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <DateTime value={member.lastLoginAt} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label={`Actions for ${member.email}`}
                    disabled={ws.archived}
                    onClick={(event) => setMenu({ anchor: event.currentTarget, member })}
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
            onClick={() => {
              const member = menu.member;
              setMenu(null);
              setConfirmation({
                title: `Remove ${member.email} from ${ws.name}?`,
                text: "They lose access to this workspace at once. Their account and other workspaces stay.",
                action: "Remove",
                danger: true,
                run: () =>
                  act(
                    () => api(`${ws.admin}/members/${member.id}`, { method: "DELETE" }),
                    `${member.email} was removed from ${ws.name}.`,
                  ),
              });
            }}
          >
            Remove from workspace
          </MenuItem>
        )}
      </Menu>

      <Typography variant="h6" component="h2" sx={{ mt: 4, mb: 1.5 }}>
        Pending invitations
      </Typography>
      {invitations && invitations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No pending invitations.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Pending invitations">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">
                  <VisuallyHidden>Actions</VisuallyHidden>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invitations ?? []).map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>{invitation.role}</TableCell>
                  <TableCell>
                    <DateTime value={invitation.expiresAt} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            () =>
                              api(`${ws.admin}/invitations/${invitation.id}/resend`, {
                                method: "POST",
                              }),
                            `A new link was sent to ${invitation.email}.`,
                          )
                        }
                      >
                        Resend
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={() =>
                          setConfirmation({
                            title: `Revoke the invitation of ${invitation.email}?`,
                            text: "The link in their email stops working.",
                            action: "Revoke",
                            danger: true,
                            run: () =>
                              act(
                                () =>
                                  api(`${ws.admin}/invitations/${invitation.id}`, {
                                    method: "DELETE",
                                  }),
                                "The invitation was revoked.",
                              ),
                          })
                        }
                      >
                        Revoke
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={inviting}
        onClose={busy ? undefined : () => setInviting(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={invite}>
          <DialogTitle>Add a member</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {inviteError && <Alert severity="error">{inviteError}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                autoFocus
                required
              />
              <TextField
                select
                label="Role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as Role)}
                helperText={ROLES.find((role) => role.value === inviteRole)?.description}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviting(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Add
            </Button>
          </DialogActions>
        </form>
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
