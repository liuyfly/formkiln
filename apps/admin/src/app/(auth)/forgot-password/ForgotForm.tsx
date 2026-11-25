"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../../../lib/api";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/v1/admin/auth/password/forgot", { method: "POST", body: { email } });
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <Typography variant="h5" component="h1">
        Reset your password
      </Typography>
      {sent ? (
        <Alert severity="success">
          If this email belongs to a member, a reset link is on its way. It expires in 30 minutes.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Enter your email and we will send you a link to choose a new password.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            Send link
          </Button>
        </>
      )}
      <Link component={NextLink} href="/login" variant="body2" sx={{ textAlign: "center" }}>
        Back to sign in
      </Link>
    </Stack>
  );
}
