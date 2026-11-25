"use client";

import TextField from "@mui/material/TextField";

interface Props {
  value: string;
  onChange: (value: string) => void;
  recovery?: boolean;
  autoFocus?: boolean;
}

/** Six-digit authenticator code, or a recovery code. */
export function CodeField({ value, onChange, recovery = false, autoFocus = false }: Props) {
  return recovery ? (
    <TextField
      label="Recovery code"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      autoFocus={autoFocus}
      required
    />
  ) : (
    <TextField
      label="6-digit code"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      required
      slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]{6}" } }}
    />
  );
}
