"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CodeField } from "../../../components/CodeField";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../components/Notice";
import { PageHeader } from "../../../components/PageHeader";
import { PasswordFields, passwordsReady } from "../../../components/PasswordFields";
import { RecoveryCodes } from "../../../components/RecoveryCodes";
import { useUser } from "../../../components/Shell";
import { api, errorMessage, type Session } from "../../../lib/api";
import { DateTime } from "../../../lib/format";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function ChangePassword({ onDone }: { onDone: (notice: NoticeMessage) => void }) {
  const user = useUser();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/v1/admin/me/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: password },
      });
      setCurrent("");
      setPassword("");
      setConfirm("");
      onDone({
        severity: "success",
        text: "Password changed. Your other sessions were signed out.",
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={submit} sx={{ maxWidth: 420 }}>
      {/* Lets password managers associate the new password with the account. */}
      <input type="hidden" autoComplete="username" value={user.email} readOnly />
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        required
      />
      <PasswordFields
        label="New password"
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
      />
      <div>
        <Button
          type="submit"
          variant="contained"
          disabled={busy || !current || !passwordsReady(password, confirm)}
        >
          Change password
        </Button>
      </div>
    </Stack>
  );
}

function NewRecoveryCodes() {
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ recoveryCodes: string[] }>("/v1/admin/me/recovery-codes", {
        method: "POST",
        body: { code },
      });
      setCodes(result.recoveryCodes);
      setCode("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (codes) return <RecoveryCodes codes={codes} />;
  return (
    <Stack component="form" spacing={2} onSubmit={submit} sx={{ maxWidth: 420 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <CodeField value={code} onChange={setCode} />
      <div>
        <Button type="submit" variant="outlined" disabled={busy || code.length !== 6}>
          Generate new codes
        </Button>
      </div>
    </Stack>
  );
}

function Sessions({ onNotice }: { onNotice: (notice: NoticeMessage) => void }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSessions(await api<Session[]>("/v1/admin/me/sessions"));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (session: Session) => {
    setBusy(true);
    try {
      await api(`/v1/admin/me/sessions/${session.id}`, { method: "DELETE" });
      onNotice({ severity: "success", text: "The session was signed out." });
      await load();
    } catch (failure) {
      onNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <TableContainer>
      <Table size="small" aria-label="Active sessions">
        <TableHead>
          <TableRow>
            <TableCell>Device</TableCell>
            <TableCell>IP address</TableCell>
            <TableCell>Signed in</TableCell>
            <TableCell>Last active</TableCell>
            <TableCell align="right">
              <VisuallyHidden>Actions</VisuallyHidden>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(sessions ?? []).map((session) => (
            <TableRow key={session.id}>
              <TableCell sx={{ maxWidth: 320 }}>
                <Typography variant="body2" noWrap title={session.userAgent ?? undefined}>
                  {session.userAgent ?? "Unknown"}
                </Typography>
                {session.current && (
                  <Chip
                    size="small"
                    label="This session"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                )}
              </TableCell>
              <TableCell>{session.ip ?? "—"}</TableCell>
              <TableCell>
                <DateTime value={session.createdAt} />
              </TableCell>
              <TableCell>
                <DateTime value={session.lastSeenAt} />
              </TableCell>
              <TableCell align="right">
                {!session.current && (
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() => void revoke(session)}
                  >
                    Sign out
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function SettingsView() {
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  return (
    <>
      <PageHeader title="Settings" description="Your sign-in security." />
      <Stack spacing={3}>
        <Section
          title="Password"
          description="Changing your password signs out your other sessions."
        >
          <ChangePassword onDone={setNotice} />
        </Section>
        <Section
          title="Recovery codes"
          description="Generate a new set if you used or lost your codes. Your old codes stop working. Enter a code from your authenticator app to confirm."
        >
          <NewRecoveryCodes />
        </Section>
        <Section
          title="Active sessions"
          description="Devices signed in to your account. Sessions end after 30 minutes of inactivity or 12 hours."
        >
          <Sessions onNotice={setNotice} />
        </Section>
      </Stack>
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
