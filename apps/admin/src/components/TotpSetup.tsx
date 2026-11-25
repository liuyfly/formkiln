"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { TotpEnrollment } from "../lib/api";

/** QR code and manual key for adding the account to an authenticator app. */
export function TotpSetup({ enrollment }: { enrollment: TotpEnrollment }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(enrollment.otpauthUri, { margin: 1, width: 192 })
      .then((url) => !cancelled && setQr(url))
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [enrollment.otpauthUri]);

  const grouped = enrollment.secret.replace(/(.{4})/g, "$1 ").trim();
  return (
    <Box sx={{ display: "grid", gap: 1.5, justifyItems: "center", my: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Scan this code with an authenticator app (for example 1Password, Google Authenticator or
        Microsoft Authenticator).
      </Typography>
      {qr ? (
        <img src={qr} width={192} height={192} alt="QR code for your authenticator app" />
      ) : (
        <Box sx={{ width: 192, height: 192, bgcolor: "action.hover", borderRadius: 1 }} />
      )}
      <Typography variant="body2" color="text.secondary">
        Or enter this key manually:
      </Typography>
      <Typography
        component="code"
        sx={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", textAlign: "center" }}
      >
        {grouped}
      </Typography>
    </Box>
  );
}
