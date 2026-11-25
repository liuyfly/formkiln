"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CodeField } from "../../../components/CodeField";
import { RecoveryCodes } from "../../../components/RecoveryCodes";
import { TotpSetup } from "../../../components/TotpSetup";
import { api, errorMessage, type LoginChallenge, type SignedIn } from "../../../lib/api";

/** Only same-site paths are accepted as the destination after signing in. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      setChallenge(
        await api<LoginChallenge>("/v1/admin/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      );
      setPassword("");
    });
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    void run(async () => {
      const signedIn = await api<SignedIn>("/v1/admin/auth/mfa", {
        method: "POST",
        body: useRecovery
          ? { challenge: challenge.challenge, recoveryCode: code }
          : { challenge: challenge.challenge, code },
      });
      if (signedIn.recoveryCodes?.length) setRecoveryCodes(signedIn.recoveryCodes);
      else {
        router.replace(next);
        router.refresh();
      }
    });
  };

  if (recoveryCodes) {
    return (
      <Stack spacing={3}>
        <Typography variant="h5" component="h1">
          Authenticator set up
        </Typography>
        <RecoveryCodes codes={recoveryCodes} />
        <Button
          variant="contained"
          onClick={() => {
            router.replace(next);
            router.refresh();
          }}
        >
          Continue
        </Button>
      </Stack>
    );
  }

  if (challenge) {
    return (
      <Stack component="form" spacing={2} onSubmit={submitCode} noValidate>
        <Typography variant="h5" component="h1">
          {challenge.enrollTotp ? "Set up your authenticator" : "Two-step verification"}
        </Typography>
        {challenge.enrollTotp ? (
          <TotpSetup enrollment={challenge.enrollTotp} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {useRecovery
              ? "Enter one of your recovery codes."
              : "Enter the code from your authenticator app."}
          </Typography>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <CodeField value={code} onChange={setCode} recovery={useRecovery} autoFocus />
        <Button type="submit" variant="contained" size="large" disabled={busy || !code}>
          Verify
        </Button>
        {!challenge.enrollTotp && (
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setCode("");
              setError(null);
            }}
          >
            {useRecovery ? "Use your authenticator app" : "Use a recovery code"}
          </Link>
        )}
      </Stack>
    );
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submitPassword}>
      <Typography variant="h5" component="h1">
        Sign in
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
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Button type="submit" variant="contained" size="large" disabled={busy}>
        Continue
      </Button>
      <Link
        component={NextLink}
        href="/forgot-password"
        variant="body2"
        sx={{ textAlign: "center" }}
      >
        Forgot your password?
      </Link>
    </Stack>
  );
}
