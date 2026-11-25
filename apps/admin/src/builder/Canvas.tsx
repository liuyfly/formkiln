"use client";

import Add from "@mui/icons-material/Add";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import DragIndicator from "@mui/icons-material/DragIndicator";
import DriveFileMove from "@mui/icons-material/DriveFileMove";
import FormatIndentDecrease from "@mui/icons-material/FormatIndentDecrease";
import FormatIndentIncrease from "@mui/icons-material/FormatIndentIncrease";
import MoreVert from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Element, Text } from "@formkiln/spec";
import { useState, type MouseEvent, type ReactNode } from "react";
import { catalogEntry } from "./catalog";
import { DropZone, useElementDrag, usePageDrop } from "./dnd";
import { textIn } from "./inputs";
import { useBuilder } from "./store";
import { childrenOf, elementAt, isContainer, locOfPointer, sameLoc, type Loc } from "./tree";

function useDefaultLocale() {
  return useBuilder((state) => state.document.settings?.defaultLocale ?? "en");
}

/** Number of problems at or under a location. */
function useProblemCount(loc: Loc): number {
  return useBuilder(
    (state) =>
      state.problems.filter((problem) => {
        const at = locOfPointer(problem.pointer);
        return (
          !!at &&
          at.page === loc.page &&
          loc.path.every((index, i) => at.path[i] === index) &&
          at.path.length >= loc.path.length
        );
      }).length,
  );
}

function ActionButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" aria-label={title} onClick={onClick} disabled={disabled ?? false}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function SelectedActions({ loc, readOnly }: { loc: Loc; readOnly: boolean }) {
  const store = useBuilder();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const siblings =
    loc.path.length > 1
      ? childrenOf(elementAt(store.document, { page: loc.page, path: loc.path.slice(0, -1) }))
      : store.document.pages[loc.page]?.elements;
  const index = loc.path[loc.path.length - 1]!;
  const previous = index > 0 ? siblings?.[index - 1] : undefined;
  if (readOnly) return null;
  return (
    <Stack direction="row" onClick={(event) => event.stopPropagation()} sx={{ ml: "auto" }}>
      <ActionButton title="Move up" onClick={() => store.moveSelected("up")} disabled={index === 0}>
        <ArrowUpward fontSize="small" />
      </ActionButton>
      <ActionButton
        title="Move down"
        onClick={() => store.moveSelected("down")}
        disabled={!siblings || index >= siblings.length - 1}
      >
        <ArrowDownward fontSize="small" />
      </ActionButton>
      <ActionButton
        title="Move into the section above"
        onClick={() => store.moveSelected("into")}
        disabled={!isContainer(previous)}
      >
        <FormatIndentIncrease fontSize="small" />
      </ActionButton>
      <ActionButton
        title="Move out of the section"
        onClick={() => store.moveSelected("out")}
        disabled={loc.path.length < 2}
      >
        <FormatIndentDecrease fontSize="small" />
      </ActionButton>
      <ActionButton title="Duplicate" onClick={() => store.duplicateSelected()}>
        <ContentCopy fontSize="small" />
      </ActionButton>
      {store.document.pages.length > 1 && (
        <ActionButton title="Move to page" onClick={(event) => setMenu(event.currentTarget)}>
          <DriveFileMove fontSize="small" />
        </ActionButton>
      )}
      <ActionButton title="Delete" onClick={() => store.removeSelected()}>
        <DeleteOutlined fontSize="small" />
      </ActionButton>
      <Menu anchorEl={menu} open={menu !== null} onClose={() => setMenu(null)}>
        {store.document.pages.map((page, i) =>
          i === loc.page ? null : (
            <MenuItem
              key={page.key}
              onClick={() => {
                setMenu(null);
                store.moveSelectedToPage(i);
              }}
            >
              Page {i + 1}
              {page.title
                ? `: ${textIn(page.title, store.document.settings?.defaultLocale ?? "en")}`
                : ""}
            </MenuItem>
          ),
        )}
      </Menu>
    </Stack>
  );
}

function ElementCard({
  element,
  loc,
  readOnly,
}: {
  element: Element;
  loc: Loc;
  readOnly: boolean;
}) {
  const selected = useBuilder(
    (state) => state.selection.kind === "element" && sameLoc(state.selection.loc, loc),
  );
  const select = useBuilder((state) => state.select);
  const locale = useDefaultLocale();
  const problems = useProblemCount(loc);
  const any = element as unknown as Record<string, unknown>;
  const title =
    textIn((any.label ?? any.title) as Text | undefined, locale) ||
    (element.type === "content" ? textIn(any.text as Text, locale).slice(0, 80) : "") ||
    element.key;
  const children = childrenOf(element);
  const drag = useElementDrag(loc, readOnly);
  return (
    <Paper
      variant="outlined"
      // A convenience for pointers; keyboard and screen reader users select with the button below,
      // which keeps the drag handle and the actions out of it (no nested controls).
      onClick={(event) => {
        event.stopPropagation();
        select({ kind: "element", loc });
      }}
      sx={{
        p: 1.25,
        cursor: "pointer",
        borderColor: selected ? "primary.main" : problems ? "error.main" : "divider",
        borderWidth: selected ? 2 : 1,
        bgcolor: isContainer(element) ? "action.hover" : "background.paper",
        opacity: drag.isDragging ? 0.4 : 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minHeight: 30 }}>
        {!readOnly && (
          <Box
            ref={drag.setNodeRef}
            {...drag.listeners}
            {...drag.attributes}
            aria-label={`Drag ${title}`}
            onClick={(event) => event.stopPropagation()}
            sx={{
              display: "flex",
              color: "text.secondary",
              cursor: "grab",
              touchAction: "none",
              borderRadius: 1,
              "&:focus-visible": {
                outline: 2,
                outlineStyle: "solid",
                outlineColor: "primary.main",
              },
            }}
          >
            <DragIndicator fontSize="small" />
          </Box>
        )}
        <ButtonBase
          aria-pressed={selected}
          onClick={(event) => {
            event.stopPropagation();
            select({ kind: "element", loc });
          }}
          sx={{
            display: "block",
            flexGrow: 1,
            minWidth: 0,
            textAlign: "left",
            borderRadius: 1,
            "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineStyle: "solid" },
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ display: "block", fontWeight: 500 }}
            noWrap
          >
            {title}
            {any.required === true && (
              <Box component="span" sx={{ color: "error.main" }}>
                {" "}
                *
              </Box>
            )}
          </Typography>
          <Stack
            component="span"
            direction="row"
            spacing={0.5}
            sx={{ mt: 0.25, flexWrap: "wrap", gap: 0.5 }}
          >
            <Chip
              component="span"
              size="small"
              label={catalogEntry(element.type)?.label ?? element.type}
            />
            <Chip
              component="span"
              size="small"
              variant="outlined"
              label={element.key}
              sx={{ fontFamily: "monospace" }}
            />
            {any.sensitive === true && (
              <Chip
                component="span"
                size="small"
                variant="outlined"
                color="warning"
                label="Sensitive"
              />
            )}
            {any.visible !== undefined && (
              <Chip component="span" size="small" variant="outlined" label="Conditional" />
            )}
            {typeof any.required === "object" && (
              <Chip
                component="span"
                size="small"
                variant="outlined"
                label="Conditionally required"
              />
            )}
            {problems > 0 && (
              <Chip
                component="span"
                size="small"
                color="error"
                label={`${problems} problem${problems > 1 ? "s" : ""}`}
              />
            )}
          </Stack>
        </ButtonBase>
        {selected && <SelectedActions loc={loc} readOnly={readOnly} />}
      </Stack>
      {children && (
        <Box
          sx={{ mt: 1, pl: 1.5, borderLeft: 2, borderColor: "divider", display: "grid", gap: 1 }}
        >
          <ElementList
            elements={children}
            page={loc.page}
            parent={loc.path}
            readOnly={readOnly}
            emptyText={`Empty. Drag fields here, or select this ${element.type === "repeater" ? "group" : "section"} and add fields.`}
          />
        </Box>
      )}
    </Paper>
  );
}

/** Elements of one list with drop zones between them while dragging. */
function ElementList({
  elements,
  page,
  parent,
  readOnly,
  emptyText,
}: {
  elements: Element[];
  page: number;
  parent: number[];
  readOnly: boolean;
  emptyText: string;
}) {
  if (elements.length === 0) {
    return (
      <>
        <DropZone slot={{ page, parent, index: 0 }} label="Drop here" />
        <Typography variant="caption" color="text.secondary">
          {emptyText}
        </Typography>
      </>
    );
  }
  return (
    <>
      {elements.map((child, index) => (
        <Box key={`${child.key}-${index}`} sx={{ display: "grid", gap: 1 }}>
          <DropZone slot={{ page, parent, index }} />
          <ElementCard
            element={child}
            loc={{ page, path: [...parent, index] }}
            readOnly={readOnly}
          />
        </Box>
      ))}
      <DropZone slot={{ page, parent, index: elements.length }} />
    </>
  );
}

function PageTab({ index, label, ...props }: { index: number; label: string; value: number }) {
  const { setNodeRef, isOver } = usePageDrop(index);
  return (
    <Tab
      ref={setNodeRef}
      {...props}
      label={label}
      sx={{
        textTransform: "none",
        bgcolor: isOver ? "action.selected" : undefined,
        borderRadius: 1,
      }}
    />
  );
}

function PageBar({ readOnly }: { readOnly: boolean }) {
  const pages = useBuilder((state) => state.document.pages);
  const page = useBuilder((state) => state.page);
  const store = useBuilder.getState;
  const locale = useDefaultLocale();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  return (
    <Stack
      direction="row"
      // Page tabs and actions handle their own clicks; the canvas click (select the page) would undo a tab switch.
      onClick={(event) => event.stopPropagation()}
      sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", mb: 2 }}
    >
      <Tabs
        value={Math.min(page, pages.length - 1)}
        onChange={(_, value: number) => store().showPage(value)}
        variant="scrollable"
        sx={{ flexGrow: 1, minWidth: 0 }}
        aria-label="Pages"
      >
        {pages.map((p, index) => (
          <PageTab
            key={`${p.key}-${index}`}
            index={index}
            value={index}
            label={textIn(p.title, locale) || `Page ${index + 1}`}
          />
        ))}
      </Tabs>
      {!readOnly && (
        <>
          <Tooltip title="Add page">
            <IconButton aria-label="Add page" onClick={() => store().addPage()}>
              <Add />
            </IconButton>
          </Tooltip>
          <IconButton aria-label="Page actions" onClick={(event) => setMenu(event.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={menu} open={menu !== null} onClose={() => setMenu(null)}>
            <MenuItem
              onClick={() => {
                setMenu(null);
                store().select({ kind: "page", page });
              }}
            >
              Page settings
            </MenuItem>
            <MenuItem
              disabled={page === 0}
              onClick={() => (setMenu(null), store().movePage(page, -1))}
            >
              Move page left
            </MenuItem>
            <MenuItem
              disabled={page >= pages.length - 1}
              onClick={() => (setMenu(null), store().movePage(page, 1))}
            >
              Move page right
            </MenuItem>
            <MenuItem
              disabled={pages.length <= 1}
              onClick={() => (setMenu(null), store().removePage(page))}
              sx={{ color: "error.main" }}
            >
              Delete page
            </MenuItem>
          </Menu>
        </>
      )}
    </Stack>
  );
}

/** The pages and the element tree of the shown page. */
export function Canvas({ readOnly }: { readOnly: boolean }) {
  const page = useBuilder((state) => state.page);
  const current = useBuilder(
    (state) => state.document.pages[Math.min(state.page, state.document.pages.length - 1)],
  );
  const select = useBuilder((state) => state.select);
  const formTitle = useBuilder((state) => state.document.title);
  const locale = useDefaultLocale();
  return (
    <Box onClick={() => select({ kind: "page", page })} sx={{ minHeight: "100%" }}>
      <Button
        variant="text"
        onClick={(event) => {
          event.stopPropagation();
          select({ kind: "form" });
        }}
        sx={{ textTransform: "none", fontSize: 20, fontWeight: 600, px: 1, mb: 1 }}
      >
        {textIn(formTitle, locale) || "Untitled form"}
      </Button>
      <PageBar readOnly={readOnly} />
      <Stack spacing={1}>
        {current && (
          <ElementList
            elements={current.elements}
            page={page}
            parent={[]}
            readOnly={readOnly}
            emptyText="This page is empty. Add fields from the left, or drag them here."
          />
        )}
      </Stack>
    </Box>
  );
}
