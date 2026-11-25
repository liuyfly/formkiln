"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import type { ReactNode } from "react";

export interface NoticeMessage {
  severity: "success" | "error";
  text: string;
}

/** Short feedback after an action. */
export function Notice({ notice, onClose }: { notice: NoticeMessage | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <Snackbar
      open
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={notice.severity} variant="filled" onClose={onClose}>
        {notice.text}
      </Alert>
    </Snackbar>
  );
}

/** Text for screen readers only (for example the header of an actions column). */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        whiteSpace: "nowrap",
        width: "1px",
      }}
    >
      {children}
    </Box>
  );
}
