"use client";

import TextField from "@mui/material/TextField";

export const PASSWORD_HINT = "12 to 128 characters. A passphrase of several words works well.";

interface Props {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  label?: string;
}

/** New password with confirmation; the server enforces the policy. */
export function PasswordFields({ password, confirm, onPassword, onConfirm, label }: Props) {
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <>
      <TextField
        label={label ?? "Password"}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        helperText={PASSWORD_HINT}
        required
        slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }}
      />
      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => onConfirm(event.target.value)}
        error={mismatch}
        helperText={mismatch ? "The passwords do not match." : " "}
        required
      />
    </>
  );
}

export function passwordsReady(password: string, confirm: string): boolean {
  return password.length >= 12 && password === confirm;
}
