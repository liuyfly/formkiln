"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useState } from "react";

/** Shows one-time recovery codes once, with copy and download. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "formkiln-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        Save these recovery codes somewhere safe. Each one signs you in once if you lose your
        authenticator. They are not shown again.
      </Alert>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 2,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          fontFamily: "monospace",
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          onClick={() =>
            navigator.clipboard.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outlined" onClick={download}>
          Download
        </Button>
      </Stack>
    </Stack>
  );
}
