"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import type { ReactNode } from "react";
import { formatSize, humanize, isFileRef, MASK } from "../../../../lib/answers";
import { withOptionLabels, type FieldInfoMap } from "../../../../lib/definition";

/** Renders any answer: scalars, file lists with download links, composite values and repeaters. */
export function SubmissionValue({
  value,
  formKey,
  fields,
}: {
  value: unknown;
  formKey: string;
  /** Labels of the submission's version, for keys inside composite values and repeater items. */
  fields?: FieldInfoMap | undefined;
}): ReactNode {
  if (value === null || value === undefined || value === "") {
    return (
      <Box component="span" sx={{ color: "text.disabled" }}>
        —
      </Box>
    );
  }
  if (value === MASK) return <Chip size="small" label="Hidden" variant="outlined" />;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") {
    return (
      <Box component="span" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {String(value)}
      </Box>
    );
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isFileRef)) {
      return (
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {value.map((file) => (
            <li key={file.id}>
              <Link href={`/v1/manage/forms/${formKey}/files/${file.id}`} download={file.name}>
                {file.name}
              </Link>{" "}
              <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
                ({formatSize(file.size)})
              </Box>
            </li>
          ))}
        </Box>
      );
    }
    if (value.every((item) => typeof item !== "object" || item === null)) return value.join(", ");
    return (
      <Box sx={{ display: "grid", gap: 1 }}>
        {value.map((item, index) => (
          <Box key={index} sx={{ borderLeft: 2, borderColor: "divider", pl: 1.5 }}>
            <Box sx={{ fontSize: 12, color: "text.secondary" }}>#{index + 1}</Box>
            <SubmissionValue value={item} formKey={formKey} fields={fields} />
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        columnGap: 1.5,
        rowGap: 0.5,
      }}
    >
      {Object.entries(value as Record<string, unknown>).map(([key, part]) => (
        <Box key={key} sx={{ display: "contents" }}>
          <Box component="dt" sx={{ color: "text.secondary" }}>
            {fields?.get(key)?.label ?? humanize(key)}
          </Box>
          <Box component="dd" sx={{ m: 0 }}>
            <SubmissionValue
              value={withOptionLabels(part, fields?.get(key))}
              formKey={formKey}
              fields={fields}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
