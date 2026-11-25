"use client";

import Add from "@mui/icons-material/Add";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../components/ConfirmDialog";
import { CopyButton } from "../../../../../components/CopyButton";
import { Notice, VisuallyHidden, type NoticeMessage } from "../../../../../components/Notice";
import { useUser } from "../../../../../components/Shell";
import { api, canEdit, errorMessage, type Delivery, type Webhook } from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";

const STATUS_COLOR = { pending: "warning", succeeded: "success", dead: "error" } as const;

function Deliveries({
  formKey,
  webhook,
  editor,
  onNotice,
}: {
  formKey: string;
  webhook: Webhook;
  editor: boolean;
  onNotice: (notice: NoticeMessage) => void;
}) {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Delivery[]>(`/v1/manage/forms/${formKey}/webhooks/${webhook.id}/deliveries?limit=50`).then(
      setDeliveries,
      (failure) => onNotice({ severity: "error", text: errorMessage(failure) }),
    );
  }, [formKey, webhook.id, onNotice]);

  useEffect(load, [load]);

  const redeliver = async (delivery: Delivery) => {
    setBusy(true);
    try {
      await api(`/v1/manage/forms/${formKey}/webhook-deliveries/${delivery.id}/redeliver`, {
        method: "POST",
      });
      onNotice({ severity: "success", text: "The delivery is queued again." });
      load();
    } catch (failure) {
      onNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  if (!deliveries) return null;
  if (deliveries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        No deliveries yet. Each new submission is sent to this URL.
      </Typography>
    );
  }
  return (
    <TableContainer sx={{ mt: 1 }}>
      <Table size="small" aria-label={`Deliveries to ${webhook.url}`}>
        <TableHead>
          <TableRow>
            <TableCell>Created</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Attempts</TableCell>
            <TableCell>Last response</TableCell>
            <TableCell>Next attempt</TableCell>
            <TableCell align="right">
              <VisuallyHidden>Actions</VisuallyHidden>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <DateTime value={delivery.createdAt} />
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  color={STATUS_COLOR[delivery.status]}
                  label={delivery.status}
                />
              </TableCell>
              <TableCell align="right">{delivery.attempts}</TableCell>
              <TableCell>
                {delivery.lastError ?? (delivery.lastStatus ? `HTTP ${delivery.lastStatus}` : "—")}
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <DateTime value={delivery.nextAttemptAt} />
              </TableCell>
              <TableCell align="right">
                {editor && delivery.status !== "pending" && (
                  <Button size="small" disabled={busy} onClick={() => void redeliver(delivery)}>
                    Redeliver
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function WebhooksView({ formKey }: { formKey: string }) {
  const user = useUser();
  const editor = canEdit(user);
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [created, setCreated] = useState<Webhook | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const load = useCallback(() => {
    api<Webhook[]>(`/v1/manage/forms/${formKey}/webhooks`).then(setWebhooks, (failure) =>
      setError(errorMessage(failure)),
    );
  }, [formKey]);

  useEffect(load, [load]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setAddError(null);
    try {
      setCreated(
        await api<Webhook>(`/v1/manage/forms/${formKey}/webhooks`, {
          method: "POST",
          body: { url },
        }),
      );
      setUrl("");
      load();
    } catch (failure) {
      setAddError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const closeAdd = () => {
    setAdding(false);
    setCreated(null);
    setAddError(null);
    setUrl("");
  };

  return (
    <>
      <Stack direction="row" sx={{ mb: 2, alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, minWidth: 240 }}>
          Every new submission is sent as a signed <code>POST</code> (header{" "}
          <code>Formkiln-Signature</code>) and retried for about two hours if your endpoint fails.
        </Typography>
        {editor && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>
            Add webhook
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {webhooks && webhooks.length === 0 && (
        <Typography color="text.secondary">No webhooks.</Typography>
      )}
      <Stack spacing={2}>
        {(webhooks ?? []).map((webhook) => (
          <Card key={webhook.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Box component="code" sx={{ flexGrow: 1, wordBreak: "break-all", fontSize: 14 }}>
                  {webhook.url}
                </Box>
                <Button
                  size="small"
                  endIcon={open === webhook.id ? <ExpandLess /> : <ExpandMore />}
                  aria-expanded={open === webhook.id}
                  onClick={() => setOpen(open === webhook.id ? null : webhook.id)}
                >
                  Deliveries
                </Button>
                {editor && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() =>
                      setConfirmation({
                        title: "Delete this webhook?",
                        text: `Submissions are no longer sent to ${webhook.url}, and pending deliveries are dropped.`,
                        action: "Delete",
                        danger: true,
                        run: async () => {
                          setBusy(true);
                          try {
                            await api(`/v1/manage/forms/${formKey}/webhooks/${webhook.id}`, {
                              method: "DELETE",
                            });
                            setNotice({ severity: "success", text: "The webhook was deleted." });
                            load();
                          } catch (failure) {
                            setNotice({ severity: "error", text: errorMessage(failure) });
                          } finally {
                            setBusy(false);
                            setConfirmation(null);
                          }
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Added <DateTime value={webhook.createdAt} />
              </Typography>
              <Collapse in={open === webhook.id} unmountOnExit>
                <Deliveries
                  formKey={formKey}
                  webhook={webhook}
                  editor={editor}
                  onNotice={setNotice}
                />
              </Collapse>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={adding} onClose={busy ? undefined : closeAdd} maxWidth="sm" fullWidth>
        {created ? (
          <>
            <DialogTitle>Webhook added</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Alert severity="warning">
                  Copy the signing secret now. It is not shown again. Use it to verify the{" "}
                  <code>Formkiln-Signature</code> header.
                </Alert>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Box
                    component="code"
                    sx={{
                      flexGrow: 1,
                      p: 1,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {created.secret}
                  </Box>
                  <CopyButton text={created.secret ?? ""} />
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={closeAdd}>
                Done
              </Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={add}>
            <DialogTitle>Add a webhook</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {addError && <Alert severity="error">{addError}</Alert>}
                <TextField
                  label="Endpoint URL"
                  type="url"
                  placeholder="https://example.com/formkiln"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  helperText="HTTPS only. Private and internal addresses are not allowed."
                  autoFocus
                  required
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeAdd} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                Add
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
