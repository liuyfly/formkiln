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
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { api, errorMessage, type AuditEntry } from "../lib/api";
import { DateTime } from "../lib/format";

const PAGE = 100;

/**
 * An audit log, newest first, loaded page by page from `path` (a workspace's log or the
 * instance-wide one, which also shows the workspace of each entry).
 */
export function AuditLog({
  path,
  description,
  showWorkspace = false,
}: {
  path: string;
  description: string;
  showWorkspace?: boolean;
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    (before: string | null) =>
      api<AuditEntry[]>(
        `${path}?limit=${PAGE}${before ? `&before=${encodeURIComponent(before)}` : ""}`,
      ),
    [path],
  );

  useEffect(() => {
    fetchPage(null).then(
      (page) => {
        setEntries(page);
        setMore(page.length === PAGE);
      },
      (failure) => setError(errorMessage(failure)),
    );
  }, [fetchPage]);

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
      ? (entry.actorEmail ?? entry.actorId)
      : entry.actorType;

  return (
    <>
      <PageHeader title="Audit log" description={description} />
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
                {showWorkspace && <TableCell>Workspace</TableCell>}
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
                  {showWorkspace && <TableCell>{entry.workspace ?? "—"}</TableCell>}
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
