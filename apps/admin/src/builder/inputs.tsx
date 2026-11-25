"use client";

/** Small property inputs shared by the inspector. */
import type { Text } from "@formkiln/spec";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

/** The text of a localized value in one locale. */
export function textIn(value: Text | undefined, locale: string): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? Object.values(value)[0] ?? "";
}

/** Sets one locale of a text; a single-language form keeps plain strings. */
function withLocale(
  value: Text | undefined,
  locale: string,
  defaultLocale: string,
  text: string,
  multilingual: boolean,
): Text | undefined {
  if (!multilingual) return text === "" ? undefined : text;
  const map: Record<string, string> =
    value === undefined
      ? {}
      : typeof value === "string"
        ? { [defaultLocale]: value }
        : { ...value };
  if (text === "") delete map[locale];
  else map[locale] = text;
  const entries = Object.keys(map);
  if (entries.length === 0) return undefined;
  return map;
}

interface LocalizedProps {
  label: string;
  value: Text | undefined;
  onChange: (value: Text | undefined) => void;
  locales: string[];
  defaultLocale: string;
  multiline?: boolean;
  required?: boolean;
  helperText?: string;
}

/** A text in the default locale, with the other locales of the form under "Translations". */
export function LocalizedText({
  label,
  value,
  onChange,
  locales,
  defaultLocale,
  multiline,
  required,
  helperText,
}: LocalizedProps) {
  const [open, setOpen] = useState(false);
  const others = locales.filter((locale) => locale !== defaultLocale);
  const multilingual = others.length > 0;
  const field = (locale: string, fieldLabel: string) => (
    <TextField
      key={locale}
      size="small"
      label={fieldLabel}
      value={textIn(value, locale)}
      onChange={(event) =>
        onChange(withLocale(value, locale, defaultLocale, event.target.value, multilingual))
      }
      multiline={multiline ?? false}
      minRows={multiline ? 3 : undefined}
      required={required ?? false}
      error={(required ?? false) && locale === defaultLocale && !textIn(value, locale)}
      helperText={locale === defaultLocale ? helperText : undefined}
    />
  );
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {field(defaultLocale, multilingual ? `${label} (${defaultLocale})` : label)}
      {multilingual && (
        <>
          <Button size="small" onClick={() => setOpen(!open)} sx={{ justifySelf: "start" }}>
            {open ? "Hide translations" : `Translations (${others.join(", ")})`}
          </Button>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ display: "grid", gap: 1 }}>
              {others.map((locale) => field(locale, `${label} (${locale})`))}
            </Box>
          </Collapse>
        </>
      )}
    </Box>
  );
}

/** A JSON value edited as text; applied when it parses. Empty text removes the value. */
export function JsonInput({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  helperText?: string;
}) {
  const serialized = value === undefined ? "" : JSON.stringify(value, null, 2);
  const [text, setText] = useState(serialized);
  const [error, setError] = useState<string | null>(null);
  // Follow outside changes (undo, selection changes) while not editing invalid text.
  useEffect(() => {
    setText(serialized);
    setError(null);
  }, [serialized]);
  return (
    <TextField
      size="small"
      label={label}
      value={text}
      multiline
      minRows={2}
      onChange={(event) => {
        setText(event.target.value);
        if (event.target.value.trim() === "") {
          setError(null);
          onChange(undefined);
          return;
        }
        try {
          const parsed: unknown = JSON.parse(event.target.value);
          setError(null);
          onChange(parsed);
        } catch {
          setError("Not valid JSON yet; the last valid value is kept.");
        }
      }}
      error={error !== null}
      helperText={error ?? helperText}
      slotProps={{
        htmlInput: { spellCheck: false, style: { fontFamily: "monospace", fontSize: 13 } },
      }}
    />
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled ?? false}
        />
      }
      label={label}
    />
  );
}

/** A number, or nothing when empty. */
export function NumberInput({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  helperText?: string;
}) {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value === "" ? undefined : Number(event.target.value))
      }
      helperText={helperText}
    />
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1 }}>
      {children}
    </Typography>
  );
}
