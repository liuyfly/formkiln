"use client";

/**
 * Drag and drop: palette entries and element cards are draggable; drop zones appear between
 * elements, at the end of every list and on page tabs while something is dragged. Moves use the
 * same rules as the buttons (no dropping into itself, no repeater in a repeater).
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Element } from "@formkiln/spec";
import { useState, type ReactNode } from "react";
import { catalogEntry, CATALOG } from "./catalog";
import { useBuilder } from "./store";
import { canPlace, elementAt, type Loc, type Slot } from "./tree";

type DragItem = { kind: "new"; type: string } | { kind: "element"; loc: Loc };

const encodeLoc = (loc: Loc) => `${loc.page}:${loc.path.join(".")}`;
const decodePath = (value: string) => (value === "" ? [] : value.split(".").map(Number));

export const dragId = (item: DragItem) =>
  item.kind === "new" ? `new:${item.type}` : `el:${encodeLoc(item.loc)}`;
export const slotId = (slot: Slot) => `slot:${slot.page}:${slot.parent.join(".")}:${slot.index}`;
export const pageDropId = (page: number) => `page:${page}`;

function parseDrag(id: string): DragItem | null {
  const [kind, a, b] = id.split(":");
  if (kind === "new" && a) return { kind: "new", type: a };
  if (kind === "el" && a !== undefined && b !== undefined)
    return { kind: "element", loc: { page: Number(a), path: decodePath(b) } };
  return null;
}

function parseTarget(id: string): Slot | { page: number } | null {
  const [kind, a, b, c] = id.split(":");
  if (kind === "slot" && a !== undefined && b !== undefined && c !== undefined) {
    return { page: Number(a), parent: decodePath(b), index: Number(c) };
  }
  if (kind === "page" && a !== undefined) return { page: Number(a) };
  return null;
}

/** The element a drag would place (a template for new ones). */
function draggedElement(item: DragItem): Element | undefined {
  const document = useBuilder.getState().document;
  return item.kind === "new"
    ? catalogEntry(item.type)?.create(document)
    : elementAt(document, item.loc);
}

function isInside(item: DragItem | null, slot: Slot): boolean {
  if (!item || item.kind !== "element" || item.loc.page !== slot.page) return false;
  const path = item.loc.path;
  return path.length <= slot.parent.length && path.every((v, i) => slot.parent[i] === v);
}

export function useActiveDrag(): DragItem | null {
  const { active } = useDndContext();
  return active ? parseDrag(String(active.id)) : null;
}

/** A thin target between elements; it grows into a line when hovered. */
export function DropZone({ slot, label }: { slot: Slot; label?: string }) {
  const active = useActiveDrag();
  const hidden = !active || isInside(active, slot);
  const { setNodeRef, isOver } = useDroppable({ id: slotId(slot), disabled: hidden });
  if (hidden) return null;
  const element = isOver && active ? draggedElement(active) : undefined;
  const allowed = !element || canPlace(useBuilder.getState().document, element, slot);
  return (
    <Box
      ref={setNodeRef}
      aria-hidden
      sx={{
        minHeight: label ? 36 : 10,
        my: label ? 0 : -0.5,
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: label ? 1 : 0,
        borderStyle: "dashed",
        borderColor: isOver ? (allowed ? "primary.main" : "error.main") : "divider",
        position: "relative",
        "&::after":
          isOver && !label
            ? {
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: 3,
                borderRadius: 2,
                bgcolor: allowed ? "primary.main" : "error.main",
              }
            : undefined,
      }}
    >
      {label && (
        <Typography variant="caption" color={isOver && !allowed ? "error" : "text.secondary"}>
          {isOver && !allowed ? "A repeating group cannot go inside another one" : label}
        </Typography>
      )}
    </Box>
  );
}

/** Makes a page tab a drop target (drops at the end of that page). */
export function usePageDrop(page: number) {
  const active = useActiveDrag();
  return useDroppable({ id: pageDropId(page), disabled: !active });
}

/** Drag props for an element card's handle. */
export function useElementDrag(loc: Loc, disabled: boolean) {
  return useDraggable({ id: dragId({ kind: "element", loc }), disabled });
}

/** Drag props for a palette entry. */
export function usePaletteDrag(type: string, disabled: boolean) {
  return useDraggable({ id: dragId({ kind: "new", type }), disabled });
}

/** The drop zone under the pointer; the overlapping one for keyboard drags. */
const collision: CollisionDetection = (args) => {
  const under = pointerWithin(args);
  return under.length > 0 ? under : rectIntersection(args);
};

/** Wraps the palette and canvas. `onRefused` reports drops that are not allowed. */
export function BuilderDnd({
  children,
  onRefused,
}: {
  children: ReactNode;
  onRefused: (message: string) => void;
}) {
  const sensors = useSensors(
    // A small distance keeps clicks (select, add) working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [dragging, setDragging] = useState<DragItem | null>(null);

  const onDragStart = (event: DragStartEvent) => setDragging(parseDrag(String(event.active.id)));

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const item = parseDrag(String(event.active.id));
    const target = event.over ? parseTarget(String(event.over.id)) : null;
    if (!item || !target) return;
    const store = useBuilder.getState();
    const slot: Slot =
      "parent" in target
        ? (target as Slot)
        : {
            page: target.page,
            parent: [],
            index: store.document.pages[target.page]?.elements.length ?? 0,
          };
    const ok =
      item.kind === "new"
        ? (() => {
            const entry = catalogEntry(item.type);
            return entry ? store.insertElementAt(entry.create(store.document), slot) : false;
          })()
        : store.moveElement(item.loc, slot);
    if (!ok) onRefused("It cannot be dropped there.");
  };

  const overlay = dragging ? (
    <Paper elevation={6} sx={{ px: 1.5, py: 1, display: "inline-block", pointerEvents: "none" }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {dragging.kind === "new"
          ? (CATALOG.find((entry) => entry.type === dragging.type)?.label ?? dragging.type)
          : (draggedElement(dragging)?.key ?? "")}
      </Typography>
    </Paper>
  ) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      // Drop zones appear only once a drag starts, so they are measured while dragging.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "To pick up, press space or enter. Use the arrow keys to move between drop places, space or enter to drop, escape to cancel.",
        },
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
    </DndContext>
  );
}
