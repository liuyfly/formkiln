"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { CopyButton } from "../../../../../../../../components/CopyButton";
import { Notice, type NoticeMessage } from "../../../../../../../../components/Notice";
import { api, canEdit, errorMessage, type FormSummary } from "../../../../../../../../lib/api";
import { DateTime } from "../../../../../../../../lib/format";
import { useWorkspace } from "../../../../../../../../lib/workspace";

type Mode = FormSummary["accessMode"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function LinkBox({ url }: { url: string }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ alignItems: { sm: "center" } }}
    >
      <Box
        component="code"
        sx={{
          flexGrow: 1,
          p: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
          fontSize: 13,
          wordBreak: "break-all",
        }}
      >
        {url}
      </Box>
      <Stack direction="row" spacing={1}>
        <CopyButton text={url} />
        <Button
          size="small"
          variant="outlined"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </Button>
      </Stack>
    </Stack>
  );
}

function QrCode({ url, name }: { url: string; name: string }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 512 }).then(setImage, () => setImage(null));
  }, [url]);
  if (!image) return null;
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <img src={image} width={160} height={160} alt={`QR code for ${url}`} />
      <Button size="small" href={image} download={`${name}-qr.png`}>
        Download QR code
      </Button>
    </Stack>
  );
}

const TTL_OPTIONS = [
  { seconds: 900, label: "15 minutes" },
  { seconds: 3600, label: "1 hour" },
];

export function SharingView({ formKey, hostedUrl }: { formKey: string; hostedUrl: string }) {
  const ws = useWorkspace();
  const editor = canEdit(ws);
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [subject, setSubject] = useState("");
  const [ttl, setTtl] = useState(900);
  const [testLink, setTestLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const formUrl = `${hostedUrl}/f/${ws.slug}/${formKey}`;

  useEffect(() => {
    api<FormSummary[]>(`${ws.manage}/forms`).then(
      (forms) => {
        const form = forms.find((candidate) => candidate.key === formKey);
        if (form) setMode(form.accessMode);
        else setError("This form is not published.");
      },
      (failure) => setError(errorMessage(failure)),
    );
  }, [formKey]);

  const changeMode = async (next: Mode) => {
    setBusy(true);
    try {
      await api(`${ws.manage}/forms/${formKey}/access`, { method: "PUT", body: { mode: next } });
      setMode(next);
      setTestLink(null);
      setNotice({
        severity: "success",
        text:
          next === "public"
            ? "Anyone with the link can fill in the form."
            : "The form now needs an embed token.",
      });
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  const createTestLink = async () => {
    setBusy(true);
    try {
      const result = await api<{ token: string; expiresAt: string }>(`${ws.manage}/embed-tokens`, {
        method: "POST",
        body: { formKey, ttlSeconds: ttl, ...(subject.trim() && { subject: subject.trim() }) },
      });
      setTestLink({
        url: `${formUrl}?token=${encodeURIComponent(result.token)}`,
        expiresAt: result.expiresAt,
      });
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!mode) return null;

  const issueExample = `curl -X POST "$FORMKILN_API_URL/v1/manage/workspaces/${ws.slug}/embed-tokens" \\
  -H "Authorization: Bearer $FORMKILN_SERVICE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"formKey": "${formKey}", "subject": "<your user id>"}'`;
  const iframeExample = `<iframe src="${formUrl}?token=<token>" title="${formKey}"
  style="width: 100%; min-height: 720px; border: 0"></iframe>`;

  return (
    <Stack spacing={3}>
      <Section title="Who can fill in the form">
        <RadioGroup value={mode} onChange={(event) => void changeMode(event.target.value as Mode)}>
          <FormControlLabel
            value="public"
            disabled={!editor || busy}
            control={<Radio />}
            label={
              <span>
                <strong>Anyone with the link</strong> — a public hosted page, protected by rate
                limits, a honeypot and Turnstile when configured.
              </span>
            }
          />
          <FormControlLabel
            value="token"
            disabled={!editor || busy}
            control={<Radio />}
            label={
              <span>
                <strong>Only with an embed token</strong> — your application issues a short-lived
                token for each user; the user's id is stored with the submission.
              </span>
            }
          />
        </RadioGroup>
      </Section>

      {mode === "public" ? (
        <Section title="Link">
          <Stack spacing={2}>
            <LinkBox url={formUrl} />
            <QrCode url={formUrl} name={formKey} />
          </Stack>
        </Section>
      ) : (
        <Section title="Embedding">
          <Stack spacing={2}>
            <Typography variant="body2">
              1. Your backend issues a token with the service token (lifetime 15 minutes by default,
              at most 1 hour):
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                fontSize: 13,
                overflowX: "auto",
              }}
            >
              {issueExample}
            </Box>
            <Typography variant="body2">
              2. Your page opens the form with it, for example in an iframe (allow your site with{" "}
              <code>FORMKILN_FRAME_ANCESTORS</code> on the hosted app):
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                fontSize: 13,
                overflowX: "auto",
              }}
            >
              {iframeExample}
            </Box>
            {editor && (
              <>
                <Typography variant="subtitle2" component="h3" sx={{ pt: 1 }}>
                  Test link
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    label="Subject (optional)"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 256 } }}
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    size="small"
                    select
                    label="Valid for"
                    value={ttl}
                    onChange={(event) => setTtl(Number(event.target.value))}
                    sx={{ minWidth: 160 }}
                    fullWidth={false}
                  >
                    {TTL_OPTIONS.map((option) => (
                      <MenuItem key={option.seconds} value={option.seconds}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    onClick={() => void createTestLink()}
                    disabled={busy}
                    sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Create link
                  </Button>
                </Stack>
                {testLink && (
                  <>
                    <LinkBox url={testLink.url} />
                    <Typography variant="caption" color="text.secondary">
                      Expires <DateTime value={testLink.expiresAt} />. Anyone with this link can
                      submit until then.
                    </Typography>
                  </>
                )}
              </>
            )}
          </Stack>
        </Section>
      )}
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </Stack>
  );
}
