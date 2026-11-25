"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CodeField } from "../../../components/CodeField";
import { PasswordFields, passwordsReady } from "../../../components/PasswordFields";
import { RecoveryCodes } from "../../../components/RecoveryCodes";
import { TotpSetup } from "../../../components/TotpSetup";
import {
  ApiError,
  api,
  errorMessage,
  fragmentToken,
  type InvitationDetails,
  type SignedIn,
} from "../../../lib/api";

/** Accepting an invitation: choose a password and enroll an authenticator. */
export function InviteForm() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    const value = fragmentToken();
    if (!value) {
      setLoadError("This invitation link is incomplete. Open the link from the email again.");
      return;
    }
    setToken(value);
    api<InvitationDetails>("/v1/admin/invitations/inspect", {
      method: "POST",
      body: { token: value },
    })
      .then(setDetails)
      .catch((failure) =>
        setLoadError(
          failure instanceof ApiError && failure.status < 500
            ? "This invitation is no longer valid. Ask an administrator to send a new one."
            : errorMessage(failure),
        ),
      );
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const signedIn = await api<SignedIn>("/v1/admin/invitations/accept", {
        method: "POST",
        body: { token, password, code },
      });
      // The token is used; keep it out of the history.
      window.history.replaceState(null, "", window.location.pathname);
      setRecoveryCodes(signedIn.recoveryCodes ?? []);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!details) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress aria-label="Loading invitation" />
      </Stack>
    );
  }

  if (recoveryCodes) {
    return (
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          Welcome to Formkiln
        </Typography>
        {recoveryCodes.length > 0 && <RecoveryCodes codes={recoveryCodes} />}
        <Button
          variant="contained"
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          Continue
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <Typography variant="h5" component="h1">
        Join Formkiln
      </Typography>
      <Typography variant="body2" color="text.secondary">
        You were invited as <strong>{details.role}</strong>.
      </Typography>
      <TextField label="Email" value={details.email} autoComplete="username" disabled />
      <PasswordFields
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
      />
      <Divider />
      <Typography variant="subtitle1" component="h2">
        Two-step verification
      </Typography>
      <TotpSetup enrollment={details.totp} />
      <CodeField value={code} onChange={setCode} />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={busy || !passwordsReady(password, confirm) || code.length !== 6}
      >
        Create account
      </Button>
    </Stack>
  );
}
