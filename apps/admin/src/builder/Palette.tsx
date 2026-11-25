"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CATALOG } from "./catalog";
import { useBuilder } from "./store";

const GROUPS = ["Basic", "Choice", "Date and time", "Advanced", "Layout"] as const;

/** Adds elements after the selection, inside a selected section, or at the end of the page. */
export function Palette({ disabled }: { disabled: boolean }) {
  const addElement = useBuilder((state) => state.addElement);
  return (
    <Stack spacing={1.5} component="nav" aria-label="Add a field">
      {GROUPS.map((group) => (
        <div key={group}>
          <Typography variant="overline" color="text.secondary">
            {group}
          </Typography>
          <Stack spacing={0.5}>
            {CATALOG.filter((entry) => entry.group === group).map((entry) => (
              <Button
                key={entry.type}
                size="small"
                variant="outlined"
                disabled={disabled}
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
                onClick={() => addElement(entry.create(useBuilder.getState().document))}
              >
                {entry.label}
              </Button>
            ))}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
