"use client";

import ContentCopy from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<ContentCopy fontSize="small" />}
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        )
      }
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
