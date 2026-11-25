"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { PageHeader } from "../../../components/PageHeader";
import { api, errorMessage, type AuditEntry, type User } from "../../../lib/api";
import { DateTime } from "../../../lib/format";

const PAGE = 100;

export function AuditView() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchPage = (before: string | null) =>
    api<AuditEntry[]>(
      `/v1/admin/audit?limit=${PAGE}${before ? `&before=${encodeURIComponent(before)}` : ""}`,
    );

  useEffect(() => {
    Promise.all([fetchPage(null), api<User[]>("/v1/admin/members")]).then(
      ([page, members]) => {
        setEntries(page);
        setMore(page.length === PAGE);
        setEmails(new Map(members.map((member) => [member.id, member.email])));
      },
      (failure) => setError(errorMessage(failure)),
    );
  }, []);

  const loadMore = async () => {
    if (!entries?.length) return;
    setBusy(true);
    try {
      const page = await fetchPage(entries[entries.length - 1]!.at);
      setEntries([...entries, ...page]);
      setMore(page.length === PAGE);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const actor = (entry: AuditEntry) =>
    entry.actorType === "user" && entry.actorId
      ? (emails.get(entry.actorId) ?? entry.actorId)
      : entry.actorType;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sign-ins, account changes, publications, sensitive data access and exports."
      />
      {error && <Alert severity="error">{error}</Alert>}
      {entries && entries.length === 0 && (
        <Typography color="text.secondary">Nothing recorded yet.</Typography>
      )}
      {entries && entries.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Audit log">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Target</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>IP address</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <DateTime value={entry.at} />
                  </TableCell>
                  <TableCell>{actor(entry)}</TableCell>
                  <TableCell>
                    <Box component="code" sx={{ fontSize: 13 }}>
                      {entry.action}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ wordBreak: "break-all" }}>{entry.target ?? "—"}</TableCell>
                  <TableCell>{entry.ip ?? "—"}</TableCell>
                  <TableCell>
                    {entry.details && (
                      <Box component="code" sx={{ fontSize: 12, wordBreak: "break-all" }}>
                        {entry.details}
                      </Box>
                    )}
                  </TableCell>
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
    </>
  );
}
