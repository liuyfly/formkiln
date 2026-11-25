"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import { useMemo, useState } from "react";
import { diffDocuments, lineDiff, type Change, type DiffLine } from "./diff";

const KIND = {
  added: { label: "Added", color: "success" },
  removed: { label: "Removed", color: "error" },
  changed: { label: "Changed", color: "warning" },
} as const;

function ChangeList({ title, changes }: { title: string; changes: Change[] }) {
  if (changes.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1} component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {changes.map((change, index) => (
          <Box
            component="li"
            key={index}
            sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip
                size="small"
                variant="outlined"
                color={KIND[change.kind].color}
                label={KIND[change.kind].label}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {change.subject}
              </Typography>
            </Stack>
            {change.details.length > 0 && (
              <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 3 }}>
                {change.details.map((line, i) => (
                  <Typography component="li" variant="body2" color="text.secondary" key={i}>
                    {line}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

const CONTEXT = 3;

/** Changed lines with a little context; long unchanged runs are folded. */
function JsonDiff({ lines }: { lines: DiffLine[] }) {
  const shown: (DiffLine | { fold: number })[] = [];
  let run: DiffLine[] = [];
  const flush = (end: boolean) => {
    if (run.length > CONTEXT * 2 + 1) {
      const head = shown.length === 0 ? [] : run.slice(0, CONTEXT);
      const tail = end ? [] : run.slice(-CONTEXT);
      shown.push(...head, { fold: run.length - head.length - tail.length }, ...tail);
    } else shown.push(...run);
    run = [];
  };
  for (const line of lines) {
    if (line.type === "same") run.push(line);
    else {
      flush(false);
      shown.push(line);
    }
  }
  flush(true);
  return (
    <Box
      component="pre"
      aria-label="JSON differences"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: "action.hover",
        borderRadius: 1,
        fontSize: 12,
        overflowX: "auto",
        lineHeight: 1.5,
      }}
    >
      {shown.map((line, index) =>
        "fold" in line ? (
          <Box key={index} component="span" sx={{ display: "block", color: "text.disabled" }}>
            {`  … ${line.fold} unchanged lines`}
          </Box>
        ) : (
          <Box
            key={index}
            component="span"
            sx={{
              display: "block",
              bgcolor:
                line.type === "added"
                  ? "rgba(46, 160, 67, 0.15)"
                  : line.type === "removed"
                    ? "rgba(248, 81, 73, 0.15)"
                    : undefined,
            }}
          >
            {(line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  ") + line.text}
          </Box>
        ),
      )}
    </Box>
  );
}

/** Differences between two documents: a readable summary, and the JSON on request. */
export function ChangesView({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: FormDocument;
  after: FormDocument;
  beforeLabel: string;
  afterLabel: string;
}) {
  const [json, setJson] = useState(false);
  const diff = useMemo(() => diffDocuments(before, after), [before, after]);
  const lines = useMemo(
    () => (json ? lineDiff(JSON.stringify(before, null, 2), JSON.stringify(after, null, 2)) : []),
    [json, before, after],
  );
  const total = diff.form.length + diff.pages.length + diff.elements.length;
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        From {beforeLabel} to {afterLabel}.
      </Typography>
      {total === 0 ? (
        <Alert severity="info">No differences in fields, pages, outcomes or settings.</Alert>
      ) : (
        <>
          <ChangeList title="Fields and sections" changes={diff.elements} />
          <ChangeList title="Pages" changes={diff.pages} />
          <ChangeList title="Form and outcomes" changes={diff.form} />
        </>
      )}
      <div>
        <Button size="small" onClick={() => setJson(!json)}>
          {json ? "Hide the JSON differences" : "Show the JSON differences"}
        </Button>
      </div>
      {json && <JsonDiff lines={lines} />}
    </Stack>
  );
}
