"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../../../../components/ConfirmDialog";
import { Notice, type NoticeMessage } from "../../../../../../../../components/Notice";
import { api, canEdit, errorMessage } from "../../../../../../../../lib/api";
import { useWorkspace } from "../../../../../../../../lib/workspace";

const PRESETS = [30, 90, 180, 365, 730, 1825];

/** Retention period of a form's submissions. */
export function DataView({ formKey }: { formKey: string }) {
  const ws = useWorkspace();
  const editor = canEdit(ws);
  const [saved, setSaved] = useState<number | null | undefined>(undefined);
  const [mode, setMode] = useState<string>("forever");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const show = (days: number | null) => {
    setSaved(days);
    if (days === null) setMode("forever");
    else if (PRESETS.includes(days)) setMode(String(days));
    else {
      setMode("custom");
      setCustom(String(days));
    }
  };

  useEffect(() => {
    api<{ days: number | null }>(`${ws.manage}/forms/${formKey}/retention`).then(
      (result) => show(result.days ?? null),
      (failure) => setError(errorMessage(failure)),
    );
  }, [formKey]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (saved === undefined) return null;

  const days = mode === "forever" ? null : mode === "custom" ? Number(custom) : Number(mode);
  const valid = days === null || (Number.isInteger(days) && days >= 1 && days <= 36500);
  const changed = days !== saved;

  const save = async () => {
    setBusy(true);
    try {
      const result = await api<{ days: number | null }>(`${ws.manage}/forms/${formKey}/retention`, {
        method: "PUT",
        body: { days },
      });
      show(result.days ?? null);
      setNotice({ severity: "success", text: "Retention saved." });
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" component="h2">
            Retention
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Submissions older than this are deleted automatically every hour, with their uploaded
            files. Keep only what you need.
          </Typography>
          <Stack spacing={2} sx={{ maxWidth: 420 }}>
            <TextField
              size="small"
              select
              label="Keep submissions"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              disabled={!editor}
            >
              <MenuItem value="forever">Until they are deleted</MenuItem>
              {PRESETS.map((preset) => (
                <MenuItem key={preset} value={String(preset)}>
                  {preset % 365 === 0
                    ? `${preset / 365} year${preset > 365 ? "s" : ""}`
                    : `${preset} days`}
                </MenuItem>
              ))}
              <MenuItem value="custom">A number of days…</MenuItem>
            </TextField>
            {mode === "custom" && (
              <TextField
                size="small"
                type="number"
                label="Days"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                error={!valid}
                helperText={valid ? undefined : "1 to 36500 days."}
                disabled={!editor}
              />
            )}
            {editor && (
              <div>
                <Button
                  variant="contained"
                  disabled={busy || !valid || !changed}
                  onClick={() =>
                    days !== null && (saved === null || days < saved)
                      ? setConfirmation({
                          title: "Shorten the retention period?",
                          text: `Submissions older than ${days} days will be deleted permanently within the next hour, with their files. This cannot be undone.`,
                          action: "Save and delete old submissions",
                          danger: true,
                          run: save,
                        })
                      : void save()
                  }
                >
                  Save
                </Button>
              </div>
            )}
          </Stack>
        </CardContent>
      </Card>
      <Typography variant="body2" color="text.secondary">
        To delete one submission, open it under Submissions. To delete everything a person submitted
        (an erasure request), admins use Data requests.
      </Typography>
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </Stack>
  );
}
