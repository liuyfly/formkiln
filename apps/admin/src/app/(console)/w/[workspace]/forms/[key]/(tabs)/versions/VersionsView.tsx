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
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import { useCallback, useEffect, useState } from "react";
import { ChangesView } from "../../../../../../../../builder/ChangesView";
import { Notice, type NoticeMessage } from "../../../../../../../../components/Notice";
import { PublishDialog } from "../../../../../../../../components/PublishDialog";
import { api, canEdit, errorMessage, type Version } from "../../../../../../../../lib/api";
import { DateTime } from "../../../../../../../../lib/format";
import { useWorkspace } from "../../../../../../../../lib/workspace";

/** Compares two published versions. */
function Compare({ formKey, versions }: { formKey: string; versions: Version[] }) {
  const ws = useWorkspace();
  const numbers = versions.map((v) => v.version).sort((a, b) => a - b);
  const [from, setFrom] = useState(numbers[numbers.length - 2] ?? numbers[0]!);
  const [to, setTo] = useState(numbers[numbers.length - 1]!);
  const [documents, setDocuments] = useState<Record<number, FormDocument>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    for (const version of [from, to]) {
      if (documents[version]) continue;
      api<{ definition: FormDocument }>(`${ws.manage}/forms/${formKey}/versions/${version}`).then(
        (result) => setDocuments((current) => ({ ...current, [version]: result.definition })),
        (failure) => setError(errorMessage(failure)),
      );
    }
  }, [formKey, from, to, documents]);
  const select = (label: string, value: number, onChange: (v: number) => void) => (
    <TextField
      size="small"
      select
      label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      fullWidth={false}
      sx={{ minWidth: 120 }}
    >
      {numbers.map((n) => (
        <MenuItem key={n} value={n}>
          Version {n}
        </MenuItem>
      ))}
    </TextField>
  );
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Compare versions
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {select("From", from, setFrom)}
        {select("To", to, setTo)}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {documents[from] && documents[to] && (
        <ChangesView
          before={documents[from]!}
          after={documents[to]!}
          beforeLabel={`version ${from}`}
          afterLabel={`version ${to}`}
        />
      )}
    </Paper>
  );
}

export function VersionsView({ formKey }: { formKey: string }) {
  const ws = useWorkspace();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const load = useCallback(() => {
    api<Version[]>(`${ws.manage}/forms/${formKey}/versions`).then(setVersions, (failure) =>
      setError(errorMessage(failure)),
    );
  }, [formKey]);

  useEffect(load, [load]);

  return (
    <>
      {canEdit(ws) && (
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
      {versions && versions.length > 1 && <Compare formKey={formKey} versions={versions} />}
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
