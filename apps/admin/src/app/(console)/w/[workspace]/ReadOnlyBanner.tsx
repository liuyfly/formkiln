"use client";

import Alert from "@mui/material/Alert";
import { DateTime } from "../../../../lib/format";

/** Shown while an instance admin reads a workspace they are not a member of. */
export function ReadOnlyBanner({ name, until }: { name: string; until: string }) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      Read-only access to {name} as instance admin, until <DateTime value={until} />. What you open
      is recorded in this workspace&apos;s audit log.
    </Alert>
  );
}
