"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CATALOG, type CatalogEntry } from "./catalog";
import { usePaletteDrag } from "./dnd";
import { useBuilder } from "./store";

/** Click to add after the selection, or drag onto the canvas. */
function PaletteButton({ entry, disabled }: { entry: CatalogEntry; disabled: boolean }) {
  const addElement = useBuilder((state) => state.addElement);
  const { setNodeRef, listeners, attributes, isDragging } = usePaletteDrag(entry.type, disabled);
  return (
    <Button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      size="small"
      variant="outlined"
      disabled={disabled}
      sx={{
        justifyContent: "flex-start",
        textTransform: "none",
        opacity: isDragging ? 0.5 : 1,
        touchAction: "none",
      }}
      onClick={() => addElement(entry.create(useBuilder.getState().document))}
    >
      {entry.label}
    </Button>
  );
}

const GROUPS = ["Basic", "Choice", "Date and time", "Advanced", "Layout"] as const;

/** Adds elements after the selection, inside a selected section, at the end of the page, or where dropped. */
export function Palette({ disabled }: { disabled: boolean }) {
  return (
    <Stack spacing={1.5} component="nav" aria-label="Add a field">
      {GROUPS.map((group) => (
        <div key={group}>
          <Typography variant="overline" color="text.secondary">
            {group}
          </Typography>
          <Stack spacing={0.5}>
            {CATALOG.filter((entry) => entry.group === group).map((entry) => (
              <PaletteButton key={entry.type} entry={entry} disabled={disabled} />
            ))}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
