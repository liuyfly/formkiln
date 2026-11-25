"use client";

import Close from "@mui/icons-material/Close";
import Download from "@mui/icons-material/Download";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, type Confirmation } from "../../../../../components/ConfirmDialog";
import { useUser } from "../../../../../components/Shell";
import { api, canEdit, errorMessage, type Submission } from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";
import { humanize, previewText } from "../../../../../lib/answers";
import {
  fieldInfo,
  orderedEntries,
  withOptionLabels,
  type FieldInfoMap,
} from "../../../../../lib/definition";
import { SubmissionValue } from "./SubmissionValue";

const PAGE = 50;

export function SubmissionsView({ formKey }: { formKey: string }) {
  const user = useUser();
  const editor = canEdit(user);
  const [reveal, setReveal] = useState(false);
  const [items, setItems] = useState<Submission[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [exportMenu, setExportMenu] = useState<HTMLElement | null>(null);
  // Field labels by version, fetched when a submission of that version is opened.
  const [definitions, setDefinitions] = useState<Map<number, FieldInfoMap>>(new Map());
  const selectedVersion = selected?.version;

  useEffect(() => {
    if (selectedVersion === undefined || definitions.has(selectedVersion)) return;
    api<{ definition: unknown }>(`/v1/manage/forms/${formKey}/versions/${selectedVersion}`).then(
      (version) =>
        setDefinitions((current) =>
          new Map(current).set(selectedVersion, fieldInfo(version.definition)),
        ),
      () => setDefinitions((current) => new Map(current).set(selectedVersion, new Map())),
    );
  }, [formKey, selectedVersion, definitions]);

  const fields = selectedVersion === undefined ? undefined : definitions.get(selectedVersion);

  const fetchPage = useCallback(
    async (after: Submission | null, revealed: boolean) => {
      const query = new URLSearchParams({ limit: String(PAGE), reveal: String(revealed) });
      if (after) {
        query.set("before", after.submittedAt);
        query.set("beforeId", after.id);
      }
      return api<Submission[]>(`/v1/manage/forms/${formKey}/submissions?${query}`);
    },
    [formKey],
  );

  const load = useCallback(
    async (revealed: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const page = await fetchPage(null, revealed);
        setItems(page);
        setMore(page.length === PAGE);
        setReveal(revealed);
        setSelected((current) =>
          current ? (page.find((s) => s.id === current.id) ?? null) : null,
        );
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        setBusy(false);
        setConfirmation(null);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const loadMore = async () => {
    if (!items?.length) return;
    setBusy(true);
    try {
      const page = await fetchPage(items[items.length - 1]!, reveal);
      setItems([...items, ...page]);
      setMore(page.length === PAGE);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const download = (revealed: boolean) => {
    const link = document.createElement("a");
    link.href = `/v1/manage/forms/${formKey}/submissions/export?reveal=${revealed}`;
    link.click();
  };

  // The first few answers of a submission as a one-line preview.
  const preview = (submission: Submission) =>
    Object.values(submission.data).map(previewText).filter(Boolean).slice(0, 3).join(" · ");

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2, justifyContent: "flex-end", flexWrap: "wrap" }}
      >
        {editor && (
          <Button
            variant="outlined"
            startIcon={reveal ? <VisibilityOff /> : <Visibility />}
            disabled={busy}
            onClick={() =>
              reveal
                ? void load(false)
                : setConfirmation({
                    title: "Show sensitive values?",
                    text: "Sensitive answers are shown in full. This is recorded in the audit log.",
                    action: "Show values",
                    run: () => load(true),
                  })
            }
          >
            {reveal ? "Hide sensitive values" : "Show sensitive values"}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={(event) => (editor ? setExportMenu(event.currentTarget) : download(false))}
        >
          Export CSV
        </Button>
        <Menu anchorEl={exportMenu} open={exportMenu !== null} onClose={() => setExportMenu(null)}>
          <MenuItem
            onClick={() => {
              setExportMenu(null);
              download(false);
            }}
          >
            Sensitive values masked
          </MenuItem>
          <MenuItem
            onClick={() => {
              setExportMenu(null);
              setConfirmation({
                title: "Export sensitive values?",
                text: "The file contains sensitive answers in full. Store and share it carefully. The export is recorded in the audit log.",
                action: "Export",
                danger: true,
                run: async () => {
                  download(true);
                  setConfirmation(null);
                },
              });
            }}
          >
            Including sensitive values
          </MenuItem>
        </Menu>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {items && items.length === 0 && (
        <Typography color="text.secondary">No submissions yet.</Typography>
      )}
      {items && items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Submissions">
            <TableHead>
              <TableRow>
                <TableCell>Submitted</TableCell>
                <TableCell>Answers</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Version</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((submission) => (
                <TableRow
                  key={submission.id}
                  hover
                  selected={selected?.id === submission.id}
                  onClick={() => setSelected(submission)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 400 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(submission);
                      }}
                    >
                      <DateTime value={submission.submittedAt} />
                    </Button>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" noWrap>
                      {preview(submission)}
                    </Typography>
                  </TableCell>
                  <TableCell>{submission.outcome ?? "—"}</TableCell>
                  <TableCell>{submission.subject ?? "—"}</TableCell>
                  <TableCell align="right">{submission.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {more && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button onClick={() => void loadMore()} disabled={busy}>
            Load more
          </Button>
        </Box>
      )}

      <Drawer anchor="right" open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <Box sx={{ width: { xs: "100vw", sm: 480 }, p: 3 }} role="region" aria-label="Submission">
            <Stack direction="row" sx={{ alignItems: "flex-start", mb: 2 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h6" component="h2">
                  Submission
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <DateTime value={selected.submittedAt} /> · version {selected.version}
                  {selected.outcome && ` · ${selected.outcome}`}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: "monospace" }}
                >
                  {selected.id}
                </Typography>
                {selected.subject && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Subject: {selected.subject}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                sx={{ mr: 1 }}
                href={`/v1/manage/forms/${formKey}/submissions/${selected.id}/pdf?reveal=${reveal}`}
                download
              >
                PDF
              </Button>
              {editor && (
                <Button
                  color="error"
                  size="small"
                  sx={{ mr: 1 }}
                  onClick={() =>
                    setConfirmation({
                      title: "Delete this submission?",
                      text: "The answers and uploaded files are deleted permanently, with its webhook deliveries and queued emails. This cannot be undone.",
                      action: "Delete",
                      danger: true,
                      run: async () => {
                        setBusy(true);
                        try {
                          await api(`/v1/manage/forms/${formKey}/submissions/${selected.id}`, {
                            method: "DELETE",
                          });
                          setItems(
                            (current) => current?.filter((item) => item.id !== selected.id) ?? null,
                          );
                          setSelected(null);
                        } catch (failure) {
                          setError(errorMessage(failure));
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
              <IconButton aria-label="Close" onClick={() => setSelected(null)}>
                <Close />
              </IconButton>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Box component="dl" sx={{ m: 0, display: "grid", gap: 2 }}>
              {orderedEntries(selected.data, fields ?? new Map()).map(([key, value]) => (
                <div key={key}>
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {fields?.get(key)?.label ?? humanize(key)}
                  </Typography>
                  <Box component="dd" sx={{ m: 0, mt: 0.25 }}>
                    <SubmissionValue
                      value={withOptionLabels(value, fields?.get(key))}
                      formKey={formKey}
                      fields={fields}
                    />
                  </Box>
                </div>
              ))}
            </Box>
          </Box>
        )}
      </Drawer>
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
