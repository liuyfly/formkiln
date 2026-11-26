"use client";

import MoreVert from "@mui/icons-material/MoreVert";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
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
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../components/ConfirmDialog";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../../components/Notice";
import { PageHeader } from "../../../../components/PageHeader";
import { useUser } from "../../../../components/Shell";
import { api, errorMessage, type User } from "../../../../lib/api";
import { DateTime } from "../../../../lib/format";

const BASE = "/v1/admin/instance/accounts";

export function AccountsView() {
  const me = useUser();
  const [accounts, setAccounts] = useState<User[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; account: User } | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts(await api<User[]>(BASE));
    } catch (failure) {
      setLoadError(errorMessage(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs an action, reports the outcome and reloads the list. */
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

  const update = (account: User, body: Record<string, unknown>, success: string) =>
    act(() => api(`${BASE}/${account.id}`, { method: "PATCH", body }), success);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Everyone who can sign in to this instance. Accounts join workspaces through their admins; here you disable accounts, reset authenticators and choose the instance admins."
      />

      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Accounts">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Workspaces</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last sign-in</TableCell>
              <TableCell align="right">
                <VisuallyHidden>Actions</VisuallyHidden>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(accounts ?? []).map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  {account.email}
                  {account.id === me.id && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      (you)
                    </Typography>
                  )}
                  {account.instanceAdmin && (
                    <Chip size="small" label="Instance admin" sx={{ ml: 1 }} variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {account.workspaces.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  ) : (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                      {account.workspaces.map((w) => (
                        <Chip key={w.slug} size="small" label={`${w.name} · ${w.role}`} />
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={account.status === "active" ? "Active" : "Disabled"}
                    color={account.status === "active" ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <DateTime value={account.lastLoginAt} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label={`Actions for ${account.email}`}
                    onClick={(event) => setMenu({ anchor: event.currentTarget, account })}
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
            disabled={busy}
            onClick={() => {
              const account = menu.account;
              setMenu(null);
              setConfirmation({
                title: account.instanceAdmin
                  ? `Remove instance admin from ${account.email}?`
                  : `Make ${account.email} an instance admin?`,
                text: account.instanceAdmin
                  ? "They keep their workspace memberships but can no longer manage workspaces and accounts."
                  : "They can create and archive workspaces, manage every workspace's members and accounts, and read the instance audit log. They see form data only in workspaces they belong to.",
                action: account.instanceAdmin ? "Remove" : "Make instance admin",
                danger: account.instanceAdmin,
                run: () =>
                  update(
                    account,
                    { instanceAdmin: !account.instanceAdmin },
                    account.instanceAdmin
                      ? `${account.email} is no longer an instance admin.`
                      : `${account.email} is now an instance admin.`,
                  ),
              });
            }}
          >
            {menu.account.instanceAdmin ? "Remove instance admin" : "Make instance admin"}
          </MenuItem>
        )}
        {menu && menu.account.status === "active" && menu.account.id !== me.id && (
          <MenuItem
            onClick={() => {
              const account = menu.account;
              setMenu(null);
              setConfirmation({
                title: `Disable ${account.email}?`,
                text: "They are signed out everywhere and can no longer sign in to any workspace. You can enable them again later.",
                action: "Disable",
                danger: true,
                run: () =>
                  update(account, { status: "disabled" }, `${account.email} was disabled.`),
              });
            }}
          >
            Disable
          </MenuItem>
        )}
        {menu && menu.account.status === "disabled" && (
          <MenuItem
            disabled={busy}
            onClick={() => {
              const account = menu.account;
              setMenu(null);
              void update(account, { status: "active" }, `${account.email} was enabled.`);
            }}
          >
            Enable
          </MenuItem>
        )}
        {menu && menu.account.id !== me.id && (
          <MenuItem
            onClick={() => {
              const account = menu.account;
              setMenu(null);
              setConfirmation({
                title: `Reset the authenticator of ${account.email}?`,
                text: "Their sessions end, and they set up a new authenticator the next time they sign in. Do this only after confirming their identity.",
                action: "Reset authenticator",
                danger: true,
                run: () =>
                  act(
                    () => api(`${BASE}/${account.id}/reset-totp`, { method: "POST" }),
                    `The authenticator of ${account.email} was reset.`,
                  ),
              });
            }}
          >
            Reset authenticator
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
