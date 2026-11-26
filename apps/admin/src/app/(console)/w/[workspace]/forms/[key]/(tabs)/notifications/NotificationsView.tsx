"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { textIn, Toggle } from "../../../../../../../../builder/inputs";
import { Notice, type NoticeMessage } from "../../../../../../../../components/Notice";
import {
  api,
  canEdit,
  errorMessage,
  type MailEntry,
  type NotificationSettings,
  type Version,
} from "../../../../../../../../lib/api";
import { DateTime } from "../../../../../../../../lib/format";
import { useWorkspace } from "../../../../../../../../lib/workspace";

const PLACEHOLDERS = [
  "{{form.title}}",
  "{{submission.id}}",
  "{{submission.submittedAt}}",
  "{{answers}}",
  "{{answer.<key>}}",
];
const KINDS = { team: "Team", confirmation: "Confirmation", resume: "Continue later" } as const;
const STATUS = { pending: "warning", sent: "success", dead: "error" } as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Stack spacing={1.5}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

/** Email addresses as chips; Enter, comma or leaving the input adds one. */
function RecipientsInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text
      .split(/[,;\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setText("");
  };
  return (
    <Box>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mb: value.length ? 1 : 0 }}>
        {value.map((address) => (
          <Chip
            key={address}
            label={address}
            onDelete={disabled ? undefined : () => onChange(value.filter((a) => a !== address))}
          />
        ))}
      </Stack>
      {!disabled && (
        <TextField
          size="small"
          label="Add recipient"
          placeholder="team@example.com"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={add}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          helperText="Up to 20 addresses. Press Enter to add."
        />
      )}
    </Box>
  );
}

export function NotificationsView({ formKey }: { formKey: string }) {
  const ws = useWorkspace();
  const editor = canEdit(ws);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [emailFields, setEmailFields] = useState<{ key: string; label: string }[]>([]);
  const [published, setPublished] = useState(true);
  const [mail, setMail] = useState<MailEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const loadMail = useCallback(() => {
    api<MailEntry[]>(`${ws.manage}/forms/${formKey}/mail?limit=50`).then(setMail, () => undefined);
  }, [formKey]);

  useEffect(() => {
    api<NotificationSettings>(`${ws.manage}/forms/${formKey}/notifications`).then(
      setSettings,
      (failure) => setError(errorMessage(failure)),
    );
    loadMail();
    // Email fields of the live version (the confirmation is sent for its submissions).
    api<Version[]>(`${ws.manage}/forms/${formKey}/versions`)
      .then(async (versions) => {
        const latest = versions[0];
        if (!latest) return setPublished(false);
        const { definition } = await api<{ definition: FormDocument }>(
          `${ws.manage}/forms/${formKey}/versions/${latest.version}`,
        );
        const locale = definition.settings?.defaultLocale ?? "en";
        const fields: { key: string; label: string }[] = [];
        for (const page of definition.pages) {
          for (const element of page.elements) {
            const stack = [element];
            while (stack.length) {
              const current = stack.pop()!;
              if (current.type === "email")
                fields.push({
                  key: current.key,
                  label: textIn(current.label, locale) || current.key,
                });
              if (current.type === "panel") stack.push(...(current.elements as typeof stack));
            }
          }
        }
        setEmailFields(fields);
      })
      .catch(() => setPublished(false));
  }, [formKey, loadMail]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!settings) return null;

  const update = (patch: Partial<NotificationSettings>) => {
    setSettings({ ...settings, ...patch });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const {
        teamRecipients,
        teamIncludeAnswers,
        confirmationEnabled,
        confirmationEmailField,
        confirmationSubject,
        confirmationBody,
        resumeEnabled,
      } = settings;
      setSettings(
        await api<NotificationSettings>(`${ws.manage}/forms/${formKey}/notifications`, {
          method: "PUT",
          body: {
            teamRecipients,
            teamIncludeAnswers,
            confirmationEnabled,
            confirmationEmailField,
            confirmationSubject,
            confirmationBody,
            resumeEnabled,
          },
        }),
      );
      setDirty(false);
      setNotice({ severity: "success", text: "Notifications saved." });
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      {!published && (
        <Alert severity="info">
          Notifications are sent for submissions once the form is published.
        </Alert>
      )}
      <Box
        component="fieldset"
        disabled={!editor}
        sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: "grid", gap: 3 }}
      >
        <Section
          title="Team"
          description="Email these people when someone submits the form. The message links to the submissions here."
        >
          <RecipientsInput
            value={settings.teamRecipients}
            onChange={(teamRecipients) => update({ teamRecipients })}
            disabled={!editor}
          />
          <Toggle
            label="Include the answers in the email (sensitive fields are never included)"
            checked={settings.teamIncludeAnswers}
            onChange={(teamIncludeAnswers) => update({ teamIncludeAnswers })}
            disabled={!editor}
          />
        </Section>

        <Section
          title="Confirmation"
          description="Email the person who submitted, at the address they entered in an email field."
        >
          <Toggle
            label="Send a confirmation"
            checked={settings.confirmationEnabled}
            onChange={(confirmationEnabled) => update({ confirmationEnabled })}
            disabled={!editor}
          />
          {settings.confirmationEnabled && (
            <>
              <TextField
                size="small"
                select
                label="Send to the address in"
                value={settings.confirmationEmailField ?? ""}
                onChange={(event) => update({ confirmationEmailField: event.target.value || null })}
                helperText={
                  emailFields.length ? undefined : "The published form has no email field."
                }
                error={!settings.confirmationEmailField}
              >
                {emailFields.map((field) => (
                  <MenuItem key={field.key} value={field.key}>
                    {field.label} ({field.key})
                  </MenuItem>
                ))}
                {settings.confirmationEmailField &&
                  !emailFields.some((f) => f.key === settings.confirmationEmailField) && (
                    <MenuItem value={settings.confirmationEmailField}>
                      {settings.confirmationEmailField} (not in the published form)
                    </MenuItem>
                  )}
              </TextField>
              <TextField
                size="small"
                label="Subject"
                value={settings.confirmationSubject ?? ""}
                placeholder={settings.defaultConfirmationSubject}
                onChange={(event) => update({ confirmationSubject: event.target.value || null })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Message"
                multiline
                minRows={6}
                value={settings.confirmationBody ?? ""}
                placeholder={settings.defaultConfirmationBody}
                onChange={(event) => update({ confirmationBody: event.target.value || null })}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={`Plain text. Leave empty for the default shown. Placeholders: ${PLACEHOLDERS.join(", ")}. Sensitive fields are never included.`}
              />
            </>
          )}
        </Section>

        <Section
          title="Continue later"
          description="On the hosted page, offer “Email me a link to continue later”. Public forms only; the link opens the saved draft."
        >
          <Toggle
            label="Offer links to continue later"
            checked={settings.resumeEnabled}
            onChange={(resumeEnabled) => update({ resumeEnabled })}
            disabled={!editor}
          />
        </Section>
      </Box>
      {editor && (
        <div>
          <Button variant="contained" onClick={() => void save()} disabled={busy || !dirty}>
            Save
          </Button>
        </div>
      )}

      <Box>
        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
            Sent emails
          </Typography>
          <Button size="small" onClick={loadMail}>
            Refresh
          </Button>
        </Stack>
        {mail.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No emails yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Sent emails">
              <TableHead>
                <TableRow>
                  <TableCell>Queued</TableCell>
                  <TableCell>Kind</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Attempts</TableCell>
                  <TableCell>Last error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mail.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <DateTime value={entry.createdAt} />
                    </TableCell>
                    <TableCell>{KINDS[entry.kind]}</TableCell>
                    <TableCell>{entry.recipient}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={STATUS[entry.status]}
                        label={entry.status}
                      />
                    </TableCell>
                    <TableCell align="right">{entry.attempts}</TableCell>
                    <TableCell sx={{ maxWidth: 320, wordBreak: "break-word" }}>
                      {entry.lastError ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </Stack>
  );
}
