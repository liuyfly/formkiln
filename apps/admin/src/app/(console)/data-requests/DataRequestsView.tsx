"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import { useState, type FormEvent } from "react";
import { ConfirmDialog, type Confirmation } from "../../../components/ConfirmDialog";
import { PageHeader } from "../../../components/PageHeader";
import { api, errorMessage, type ErasureResult } from "../../../lib/api";

/** Erasure requests: find, then delete, everything a person submitted. */
export function DataRequestsView() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [found, setFound] = useState<ErasureResult | null>(null);
  const [done, setDone] = useState<ErasureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const request = (dryRun: boolean) =>
    api<ErasureResult>("/v1/admin/erasure", {
      method: "POST",
      body: {
        ...(email.trim() && { email: email.trim() }),
        ...(subject.trim() && { subject: subject.trim() }),
        dryRun,
      },
    });

  const find = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setFound(await request(true));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const erase = async () => {
    setBusy(true);
    try {
      setDone(await request(false));
      setFound(null);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Data requests"
        description="Find and delete everything a person submitted, across all forms (right to erasure)."
      />
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Stack component="form" spacing={2} onSubmit={find} sx={{ maxWidth: 480 }}>
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFound(null);
                }}
                helperText="Matches submissions that contain this address in any field."
              />
              <TextField
                label="Subject"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setFound(null);
                }}
                helperText="The user id your application put in embed tokens."
              />
              <div>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy || (!email.trim() && !subject.trim())}
                >
                  Find submissions
                </Button>
              </div>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {found && (
          <Stack spacing={2}>
            {found.total === 0 ? (
              <Alert severity="info">No submissions found.</Alert>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" aria-label="Submissions found">
                    <TableHead>
                      <TableRow>
                        <TableCell>Form</TableCell>
                        <TableCell align="right">Submissions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(found.forms).map(([form, count]) => (
                        <TableRow key={form}>
                          <TableCell>{form}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <div>
                  <Button
                    color="error"
                    variant="contained"
                    disabled={busy}
                    onClick={() =>
                      setConfirmation({
                        title: `Delete ${found.total} submission${found.total === 1 ? "" : "s"}?`,
                        text: "The answers and uploaded files are deleted permanently from every form listed. This cannot be undone. The audit log records the request without the email address or subject.",
                        action: "Delete permanently",
                        danger: true,
                        run: erase,
                      })
                    }
                  >
                    Delete {found.total} submission{found.total === 1 ? "" : "s"}
                  </Button>
                </div>
              </>
            )}
            <Typography variant="body2" color="text.secondary">
              {found.note}
            </Typography>
          </Stack>
        )}

        {done && (
          <Alert severity="success">
            Deleted {done.total} submission{done.total === 1 ? "" : "s"}.
          </Alert>
        )}
      </Stack>
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
