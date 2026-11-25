"use client";

import Add from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useCallback, useEffect, useState } from "react";
import { Notice, type NoticeMessage } from "../../../../../components/Notice";
import { PublishDialog } from "../../../../../components/PublishDialog";
import { useUser } from "../../../../../components/Shell";
import { api, canEdit, errorMessage, type Version } from "../../../../../lib/api";
import { DateTime } from "../../../../../lib/format";

export function VersionsView({ formKey }: { formKey: string }) {
  const user = useUser();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const load = useCallback(() => {
    api<Version[]>(`/v1/manage/forms/${formKey}/versions`).then(setVersions, (failure) =>
      setError(errorMessage(failure)),
    );
  }, [formKey]);

  useEffect(load, [load]);

  return (
    <>
      {canEdit(user) && (
        <Stack direction="row" sx={{ mb: 2, justifyContent: "flex-end" }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setPublishing(true)}>
            Publish new version
          </Button>
        </Stack>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {versions && (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Versions">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Published</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {versions.map((version, index) => (
                <TableRow key={version.version}>
                  <TableCell>
                    {version.version}
                    {index === 0 && (
                      <Chip
                        size="small"
                        label="Live"
                        color="success"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <DateTime value={version.publishedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <PublishDialog
        open={publishing}
        formKey={formKey}
        onClose={() => setPublishing(false)}
        onPublished={(_, version) => {
          setPublishing(false);
          setNotice({ severity: "success", text: `Version ${version} is live.` });
          load();
        }}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
