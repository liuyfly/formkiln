"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import { useState } from "react";
import { useBuilder } from "./store";

/** The document as JSON, editable for anything the visual editor does not cover yet. */
export function JsonView({ readOnly }: { readOnly: boolean }) {
  const document = useBuilder((state) => state.document);
  const replace = useBuilder((state) => state.replace);
  const formatted = JSON.stringify(document, null, 2);
  const [text, setText] = useState(formatted);
  const [error, setError] = useState<string | null>(null);
  const changed = text !== formatted;

  const apply = () => {
    try {
      const parsed = JSON.parse(text) as FormDocument;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.pages) ||
        parsed.pages.length === 0
      ) {
        setError('The document needs at least one page in "pages".');
        return;
      }
      if (parsed.key !== document.key) {
        setError(`The key must stay "${document.key}".`);
        return;
      }
      replace(parsed);
      setError(null);
    } catch {
      setError("This is not valid JSON.");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        The Form Schema v1 document. Changes apply when you select Apply; they can be undone.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        multiline
        minRows={24}
        value={text}
        onChange={(event) => setText(event.target.value)}
        slotProps={{
          htmlInput: {
            spellCheck: false,
            readOnly,
            style: { fontFamily: "monospace", fontSize: 13 },
          },
        }}
        aria-label="Form document JSON"
      />
      {!readOnly && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={apply} disabled={!changed}>
            Apply
          </Button>
          <Button
            onClick={() => {
              setText(formatted);
              setError(null);
            }}
            disabled={!changed}
          >
            Revert
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
