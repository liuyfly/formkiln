"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { PasswordFields, passwordsReady } from "../../../components/PasswordFields";
import { api, errorMessage, fragmentToken } from "../../../lib/api";

export function ResetForm() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setToken(fragmentToken()), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api("/v1/admin/auth/password/reset", { method: "POST", body: { token, password } });
      window.history.replaceState(null, "", window.location.pathname);
      setDone(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (token === null) {
    return (
      <Alert severity="error">
        This reset link is incomplete. Open the link from the email again, or{" "}
        <Link component={NextLink} href="/forgot-password">
          request a new one
        </Link>
        .
      </Alert>
    );
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <Typography variant="h5" component="h1">
        Choose a new password
      </Typography>
      {done ? (
        <>
          <Alert severity="success">
            Your password was changed and every session was signed out.
          </Alert>
          <Button component={NextLink} href="/login" variant="contained">
            Sign in
          </Button>
        </>
      ) : (
        <>
          {error && <Alert severity="error">{error}</Alert>}
          <PasswordFields
            label="New password"
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy || !token || !passwordsReady(password, confirm)}
          >
            Change password
          </Button>
        </>
      )}
    </Stack>
  );
}
