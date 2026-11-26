"use client";

import ArrowBack from "@mui/icons-material/ArrowBack";
import Redo from "@mui/icons-material/Redo";
import Undo from "@mui/icons-material/Undo";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { FormDocument } from "@formkiln/spec";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog, type Confirmation } from "../components/ConfirmDialog";
import { Notice, type NoticeMessage } from "../components/Notice";
import { useUser } from "../components/Shell";
import { api, canEdit, errorMessage } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { Canvas } from "./Canvas";
import { ChangesView } from "./ChangesView";
import { BuilderDnd } from "./dnd";
import { problemText } from "./catalog";
import { Inspector } from "./Inspector";
import { JsonView } from "./JsonView";
import { Palette } from "./Palette";
import { Preview } from "./Preview";
import { PublishDialog } from "./PublishDialog";
import { useBuilder, type SaveStatus } from "./store";
import { keysById } from "./ids";
import { elementKeys, locOfPointer } from "./tree";
import { saveNow, useAutosave, type SavedCopy } from "./useAutosave";

type View = "design" | "preview" | "json" | "changes";

const STATUS: Record<
  SaveStatus,
  { label: string; color: "default" | "success" | "warning" | "error" | "info" }
> = {
  saved: { label: "Saved", color: "success" },
  dirty: { label: "Unsaved changes", color: "default" },
  saving: { label: "Saving…", color: "info" },
  error: { label: "Not saved — retry", color: "error" },
  conflict: { label: "Changed elsewhere", color: "warning" },
};

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName))
  );
}

/** The working copy compared with the live version. */
function PublishedChanges({ formKey, version }: { formKey: string; version: number }) {
  const document = useBuilder((state) => state.document);
  const [published, setPublished] = useState<FormDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ definition: FormDocument }>(`/v1/manage/forms/${formKey}/versions/${version}`).then(
      (result) => setPublished(result.definition),
      (failure) => setError(errorMessage(failure)),
    );
  }, [formKey, version]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!published) return <CircularProgress aria-label="Loading the live version" />;
  return (
    <ChangesView
      before={published}
      after={document}
      beforeLabel={`live version ${version}`}
      afterLabel="these changes"
    />
  );
}

/** The form builder for one form's working copy. */
export function Builder({ formKey }: { formKey: string }) {
  const user = useUser();
  const readOnly = !canEdit(user);
  const router = useRouter();
  const [copy, setCopy] = useState<SavedCopy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("design");
  const [publishing, setPublishing] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [problemsAnchor, setProblemsAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const store = useBuilder();
  const loaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const current = await api<SavedCopy>(`/v1/manage/forms/${formKey}/working-copy`);
      setCopy(current);
      useBuilder.getState().load(current.document, current.revision, current.problems);
      loaded.current = true;
    } catch (failure) {
      setLoadError(errorMessage(failure));
    }
  }, [formKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keys of the live version: renaming them splits the data of existing and new submissions.
  const latestVersion = copy?.latestVersion ?? null;
  useEffect(() => {
    if (latestVersion === null) {
      useBuilder.getState().setPublished(new Set(), new Map());
      return;
    }
    api<{ definition: FormDocument }>(`/v1/manage/forms/${formKey}/versions/${latestVersion}`).then(
      (result) =>
        useBuilder
          .getState()
          .setPublished(elementKeys(result.definition), keysById(result.definition)),
      () => undefined, // Only refines the rename warnings.
    );
  }, [formKey, latestVersion]);

  useAutosave(formKey, loaded.current && !readOnly);

  // Undo, redo and delete from the keyboard (not while typing in an input).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (readOnly || isTyping(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) useBuilder.getState().redo();
        else useBuilder.getState().undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        useBuilder.getState().redo();
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        useBuilder.getState().selection.kind === "element"
      ) {
        event.preventDefault();
        useBuilder.getState().removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly]);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!copy) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Loading the form" />
      </Box>
    );
  }

  const status = STATUS[store.saveStatus];
  const outdated =
    copy.latestVersion !== null && copy.baseVersion !== copy.latestVersion && copy.revision !== 0;

  const resolveConflict = async (keepMine: boolean) => {
    setBusy(true);
    try {
      const current = await api<SavedCopy>(`/v1/manage/forms/${formKey}/working-copy`);
      if (keepMine) {
        // Save my document over the revision that is there now.
        useBuilder.setState({ revision: current.revision, saveStatus: "dirty" });
        await saveNow(formKey);
      } else {
        setCopy(current);
        useBuilder.getState().load(current.document, current.revision, current.problems);
      }
    } catch (failure) {
      setNotice({ severity: "error", text: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
        >
          <Tooltip title="Back to the form">
            <IconButton
              component={NextLink}
              href={copy.latestVersion ? `/forms/${formKey}` : "/forms"}
              aria-label="Back"
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
            {formKey}
          </Typography>
          {readOnly ? (
            <Chip size="small" label="Read only" />
          ) : (
            <Chip
              size="small"
              color={status.color}
              variant="outlined"
              label={status.label}
              onClick={store.saveStatus === "error" ? () => void saveNow(formKey) : undefined}
            />
          )}
          {store.problems.length > 0 && (
            <Chip
              size="small"
              color="error"
              label={`${store.problems.length} problem${store.problems.length > 1 ? "s" : ""}`}
              onClick={(event) => setProblemsAnchor(event.currentTarget)}
            />
          )}
          <Box sx={{ flexGrow: 1 }} />
          {!readOnly && (
            <>
              <Tooltip title="Undo (Ctrl/⌘ Z)">
                <span>
                  <IconButton
                    aria-label="Undo"
                    onClick={store.undo}
                    disabled={store.past.length === 0}
                  >
                    <Undo />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Redo (Ctrl/⌘ Shift Z)">
                <span>
                  <IconButton
                    aria-label="Redo"
                    onClick={store.redo}
                    disabled={store.future.length === 0}
                  >
                    <Redo />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, value: View | null) => value && setView(value)}
            aria-label="View"
          >
            <ToggleButton value="design">Design</ToggleButton>
            <ToggleButton value="preview">Preview</ToggleButton>
            <ToggleButton value="json">JSON</ToggleButton>
            {copy.latestVersion !== null && <ToggleButton value="changes">Changes</ToggleButton>}
          </ToggleButtonGroup>
          {!readOnly && copy.latestVersion !== null && (
            <Button
              disabled={busy}
              onClick={() =>
                setConfirmation({
                  title: "Discard the changes?",
                  text: "All unpublished changes are removed and editing starts again from the published version.",
                  action: "Discard",
                  danger: true,
                  run: async () => {
                    try {
                      await api(`/v1/manage/forms/${formKey}/working-copy`, { method: "DELETE" });
                      await load();
                      setNotice({ severity: "success", text: "The changes were discarded." });
                    } catch (failure) {
                      setNotice({ severity: "error", text: errorMessage(failure) });
                    } finally {
                      setConfirmation(null);
                    }
                  },
                })
              }
            >
              Discard
            </Button>
          )}
          {!readOnly && (
            <Button variant="contained" onClick={() => setPublishing(true)}>
              Publish
            </Button>
          )}
        </Stack>
      </Paper>

      {outdated && (
        <Alert severity="info">
          Version {copy.latestVersion} was published after these changes were started from version{" "}
          {copy.baseVersion ?? "—"}. Publishing replaces it with what you see here.
        </Alert>
      )}
      {copy.revision !== 0 &&
        copy.updatedBy &&
        copy.updatedBy !== user.email &&
        store.version === 0 && (
          <Alert severity="info">
            Last changed by {copy.updatedBy} on {formatDateTime(copy.updatedAt)}.
          </Alert>
        )}

      {view === "design" && (
        <BuilderDnd onRefused={(text) => setNotice({ severity: "error", text })}>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "200px minmax(0, 1fr) 340px" },
              alignItems: "start",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                position: { md: "sticky" },
                top: { md: 80 },
                maxHeight: { md: "calc(100dvh - 100px)" },
                overflowY: "auto",
              }}
            >
              <Palette disabled={readOnly} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
              <Canvas readOnly={readOnly} />
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                position: { md: "sticky" },
                top: { md: 80 },
                maxHeight: { md: "calc(100dvh - 100px)" },
                overflowY: "auto",
              }}
            >
              <Box
                component="fieldset"
                disabled={readOnly}
                sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
              >
                <Inspector />
              </Box>
            </Paper>
          </Box>
        </BuilderDnd>
      )}
      {view === "preview" && <Preview />}
      {view === "changes" && copy.latestVersion !== null && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <PublishedChanges formKey={formKey} version={copy.latestVersion} />
        </Paper>
      )}
      {view === "json" && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <JsonView key={store.version} readOnly={readOnly} />
        </Paper>
      )}

      <Popover
        open={problemsAnchor !== null}
        anchorEl={problemsAnchor}
        onClose={() => setProblemsAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <List dense sx={{ maxWidth: 420, maxHeight: 360, overflowY: "auto" }} aria-label="Problems">
          {store.problems.map((problem, index) => {
            const at = locOfPointer(problem.pointer);
            return (
              <ListItemButton
                key={index}
                onClick={() => {
                  setProblemsAnchor(null);
                  setView("design");
                  if (at && at.path.length)
                    store.select({ kind: "element", loc: { page: at.page, path: at.path } });
                  else if (at) store.select({ kind: "page", page: at.page });
                  else store.select({ kind: "form" });
                }}
              >
                <ListItemText
                  primary={problemText(problem.code)}
                  secondary={problem.pointer || "/"}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Popover>

      <Dialog open={store.saveStatus === "conflict"} maxWidth="xs" fullWidth>
        <DialogTitle>Changed elsewhere</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Someone else saved this form while you were editing (or it was published or discarded).
            Load their version, or keep editing yours and save it over theirs.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void resolveConflict(false)} disabled={busy}>
            Load their version
          </Button>
          <Button variant="contained" onClick={() => void resolveConflict(true)} disabled={busy}>
            Keep mine
          </Button>
        </DialogActions>
      </Dialog>

      <PublishDialog
        formKey={formKey}
        open={publishing}
        onClose={() => setPublishing(false)}
        onPublished={(version) => {
          setPublishing(false);
          useBuilder.getState().setSaveStatus("saved");
          setNotice({ severity: "success", text: `Version ${version} is live.` });
          router.push(`/forms/${formKey}/versions`);
        }}
      />
      <ConfirmDialog
        confirmation={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </Box>
  );
}
