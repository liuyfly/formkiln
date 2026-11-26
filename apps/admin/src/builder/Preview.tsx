"use client";

import "@formkiln/react/styles.css";
import { KilnForm } from "@formkiln/react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Component, useState, type ReactNode } from "react";
import { textIn } from "./inputs";
import { usesWidths } from "./tree";
import { useBuilder } from "./store";

class PreviewBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  override render() {
    if (this.state.error) {
      return (
        <Alert severity="warning">
          The preview cannot show this form yet: {this.state.error}. Fix the problems listed above.
        </Alert>
      );
    }
    return this.props.children;
  }
}

/** The form as people will see it (nothing is submitted). */
export function Preview() {
  const document = useBuilder((state) => state.document);
  const version = useBuilder((state) => state.version);
  const locales = document.settings?.locales?.length
    ? document.settings.locales
    : [document.settings?.defaultLocale ?? "en"];
  const [locale, setLocale] = useState(document.settings?.defaultLocale ?? "en");
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    // A fixed width: in the builder's flex column, auto margins alone would shrink the preview to
    // the content of the current page, so pages of one form came out at different widths. As
    // wide as the hosted card (60rem for multi-column forms, Form Schema §5.5).
    <Box sx={{ width: "100%", maxWidth: usesWidths(document) ? 960 : 720, mx: "auto" }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          Preview of the unsaved form. Submitting only checks the answers.
        </Typography>
        {locales.length > 1 && (
          <TextField
            size="small"
            select
            label="Language"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            fullWidth={false}
          >
            {locales.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
      <Box
        sx={{
          p: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h5" component="p" sx={{ fontWeight: 700, mb: 2 }}>
          {textIn(document.title, locale)}
        </Typography>
        {submitted !== null && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitted(null)}>
            The answers are valid{submitted ? `; outcome “${submitted}”` : ""}. Nothing was stored.
          </Alert>
        )}
        <PreviewBoundary key={version}>
          <KilnForm
            key={`${version}-${locale}`}
            form={document}
            locale={locale}
            uploadFile={async (file) => ({
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream",
            })}
            onSubmit={({ outcome }) => {
              setSubmitted(outcome ?? "");
            }}
          />
        </PreviewBoundary>
      </Box>
    </Box>
  );
}
