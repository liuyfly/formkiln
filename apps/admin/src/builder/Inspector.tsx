"use client";

import Add from "@mui/icons-material/Add";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Element, FormDocument, Option, Outcome, Text, Validator } from "@formkiln/spec";
import type { Draft } from "immer";
import { catalogEntry, validatorTypesFor } from "./catalog";
import { JsonInput, LocalizedText, NumberInput, SectionTitle, Toggle, textIn } from "./inputs";
import { useBuilder } from "./store";
import { elementAt, type Loc } from "./tree";

const KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;

type Any = Record<string, unknown>;

/** Sets or removes (when undefined) a property. */
function assign(target: Any, property: string, value: unknown) {
  if (value === undefined) delete target[property];
  else target[property] = value;
}

function useLocales() {
  const settings = useBuilder((state) => state.document.settings);
  const defaultLocale = settings?.defaultLocale ?? "en";
  return { defaultLocale, locales: settings?.locales?.length ? settings.locales : [defaultLocale] };
}

function KeyInput({
  value,
  onChange,
  helperText,
}: {
  value: string;
  onChange: (key: string) => void;
  helperText?: string;
}) {
  const valid = KEY.test(value);
  return (
    <TextField
      size="small"
      label="Key"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={!valid}
      helperText={
        valid
          ? (helperText ??
            "Name of the answer in submissions and webhooks. Changing it after publishing starts a new column.")
          : "A lowercase letter, then letters, digits or underscores."
      }
      slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } } }}
    />
  );
}

/** A condition: always / never / an expression (edited as JSON until the logic editor). */
function ConditionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const mode =
    value === undefined || value === false ? "no" : value === true ? "yes" : "expression";
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <TextField
        size="small"
        select
        label={label}
        value={mode}
        onChange={(event) =>
          onChange(
            event.target.value === "no"
              ? undefined
              : event.target.value === "yes"
                ? true
                : { "==": [{ var: "" }, ""] },
          )
        }
      >
        <MenuItem value="no">No</MenuItem>
        <MenuItem value="yes">Yes</MenuItem>
        <MenuItem value="expression">When a condition is true</MenuItem>
      </TextField>
      {mode === "expression" && (
        <JsonInput
          label={`${label}: condition (JSON Logic)`}
          value={value}
          onChange={onChange}
          helperText="A visual editor follows."
        />
      )}
    </Box>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: Option[];
  onChange: (options: Option[]) => void;
}) {
  const { defaultLocale } = useLocales();
  const move = (index: number, delta: number) => {
    const next = [...options];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {options.map((option, index) => (
        <Stack key={index} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <TextField
            size="small"
            label="Label"
            value={textIn(option.label, defaultLocale)}
            onChange={(event) =>
              onChange(
                options.map((o, i) =>
                  i === index
                    ? {
                        ...o,
                        label:
                          typeof o.label === "string"
                            ? event.target.value
                            : { ...o.label, [defaultLocale]: event.target.value },
                      }
                    : o,
                ),
              )
            }
          />
          <TextField
            size="small"
            label="Value"
            value={option.value}
            onChange={(event) =>
              onChange(
                options.map((o, i) => (i === index ? { ...o, value: event.target.value } : o)),
              )
            }
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />
          <IconButton
            size="small"
            aria-label="Move option up"
            disabled={index === 0}
            onClick={() => move(index, -1)}
          >
            <ArrowUpward fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Move option down"
            disabled={index === options.length - 1}
            onClick={() => move(index, 1)}
          >
            <ArrowDownward fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Remove option"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button
        size="small"
        startIcon={<Add />}
        sx={{ justifySelf: "start" }}
        onClick={() => {
          let n = options.length + 1;
          while (options.some((o) => o.value === `option${n}`)) n++;
          onChange([...options, { value: `option${n}`, label: `Option ${n}` }]);
        }}
      >
        Add option
      </Button>
    </Box>
  );
}

const VALIDATOR_LABELS: Record<string, string> = {
  minLength: "Minimum length",
  maxLength: "Maximum length",
  pattern: "Pattern",
  min: "Minimum",
  max: "Maximum",
  integer: "Whole number",
  minItems: "Minimum selected",
  maxItems: "Maximum selected",
  maxFileSize: "Maximum file size (bytes)",
  fileTypes: "File types",
  minDate: "Earliest date",
  maxDate: "Latest date",
  equals: "Must be",
};

function ValidatorsEditor({
  type,
  validators,
  onChange,
}: {
  type: string;
  validators: Validator[];
  onChange: (validators: Validator[] | undefined) => void;
}) {
  const allowed = validatorTypesFor(type);
  const { defaultLocale } = useLocales();
  const set = (index: number, validator: Validator) =>
    onChange(validators.map((v, i) => (i === index ? validator : v)));
  const remove = (index: number) => {
    const next = validators.filter((_, i) => i !== index);
    onChange(next.length ? next : undefined);
  };
  const unused = allowed.filter((t) => !validators.some((v) => v.type === t));
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {validators.map((validator, index) => {
        const any = validator as Any;
        const known = allowed.includes(validator.type);
        return (
          <Box
            key={index}
            sx={{
              display: "grid",
              gap: 1,
              p: 1,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
                {VALIDATOR_LABELS[validator.type] ?? validator.type}
              </Typography>
              <IconButton size="small" aria-label="Remove rule" onClick={() => remove(index)}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Stack>
            {!known || validator.type === "expression" ? (
              <JsonInput
                label="Rule (JSON)"
                value={validator}
                onChange={(value) => value !== undefined && set(index, value as Validator)}
              />
            ) : validator.type === "integer" ? null : validator.type === "pattern" ? (
              <TextField
                size="small"
                label="Regular expression"
                value={String(any.value ?? "")}
                onChange={(event) => set(index, { ...validator, value: event.target.value })}
              />
            ) : validator.type === "fileTypes" ? (
              <TextField
                size="small"
                label="Types (comma separated)"
                placeholder=".pdf, image/*"
                value={((any.value as string[]) ?? []).join(", ")}
                onChange={(event) =>
                  set(index, {
                    ...validator,
                    value: event.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  } as Validator)
                }
              />
            ) : validator.type === "minDate" || validator.type === "maxDate" ? (
              <JsonInput
                label="Date (YYYY-MM-DD) or expression"
                value={any.value}
                onChange={(value) => set(index, { ...validator, value } as Validator)}
              />
            ) : validator.type === "equals" ? (
              <JsonInput
                label="Value"
                value={any.value}
                onChange={(value) => set(index, { ...validator, value } as Validator)}
              />
            ) : (
              <NumberInput
                label="Value"
                value={any.value as number | undefined}
                onChange={(value) => set(index, { ...validator, value: value ?? 0 } as Validator)}
              />
            )}
            <TextField
              size="small"
              label="Error message (optional)"
              value={textIn(any.message as Text | undefined, defaultLocale)}
              onChange={(event) => {
                const next = { ...validator } as Any;
                assign(next, "message", event.target.value || undefined);
                set(index, next as Validator);
              }}
            />
          </Box>
        );
      })}
      {unused.length > 0 && (
        <TextField
          size="small"
          select
          label="Add a rule"
          value=""
          onChange={(event) => {
            const type = event.target.value;
            const base: Any = { type };
            if (type === "pattern") base.value = "";
            else if (type === "fileTypes") base.value = [];
            else if (type === "minDate" || type === "maxDate") base.value = { "date.today": [] };
            else if (type === "equals") base.value = true;
            else if (type !== "integer") base.value = 0;
            onChange([...validators, base as Validator]);
          }}
        >
          {unused.map((type) => (
            <MenuItem key={type} value={type}>
              {VALIDATOR_LABELS[type] ?? type}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
}

const PARTS: Record<string, string[]> = {
  name: ["title", "given", "middle", "family"],
  address: ["line1", "line2", "city", "region", "postalCode", "country"],
};

function ElementInspector({ loc, element }: { loc: Loc; element: Element }) {
  const edit = useBuilder((state) => state.edit);
  const { locales, defaultLocale } = useLocales();
  const any = element as unknown as Any;
  const id = `${loc.page}.${loc.path.join(".")}`;
  const update = (property: string, value: unknown, coalesce = true) =>
    edit(
      (draft: Draft<FormDocument>) => {
        const target = elementAt(draft as FormDocument, loc) as unknown as Any | undefined;
        if (target) assign(target, property, value);
      },
      coalesce ? `${id}.${property}` : undefined,
    );
  const text = (
    property: string,
    label: string,
    options: { multiline?: boolean; required?: boolean; helperText?: string } = {},
  ) => (
    <LocalizedText
      label={label}
      value={any[property] as Text | undefined}
      onChange={(value) => update(property, value)}
      locales={locales}
      defaultLocale={defaultLocale}
      {...options}
    />
  );
  const type = element.type;
  const isField = !["content", "panel", "repeater"].includes(type);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{catalogEntry(type)?.label ?? type}</Typography>
      <KeyInput value={element.key} onChange={(key) => update("key", key)} />

      {type === "content" && (
        <>
          {text("text", "Text", { multiline: true, required: true })}
          <TextField
            size="small"
            select
            label="Format"
            value={(any.format as string) ?? "plain"}
            onChange={(event) => update("format", event.target.value, false)}
          >
            <MenuItem value="plain">Plain text</MenuItem>
            <MenuItem value="markdown">Markdown (bold, italic, links, lists)</MenuItem>
          </TextField>
        </>
      )}
      {type === "panel" && (
        <>
          {text("title", "Title")}
          {text("description", "Description", { multiline: true })}
        </>
      )}
      {type === "repeater" && (
        <>
          {text("label", "Label", { required: true })}
          {text("itemLabel", "Item label", {
            helperText: "Shown on each item, for example “Child”.",
          })}
          {text("description", "Description", { multiline: true })}
          <Stack direction="row" spacing={1}>
            <NumberInput
              label="Minimum items"
              value={any.minItems as number | undefined}
              onChange={(v) => update("minItems", v)}
            />
            <NumberInput
              label="Maximum items"
              value={any.maxItems as number | undefined}
              onChange={(v) => update("maxItems", v)}
            />
          </Stack>
        </>
      )}

      {isField && (
        <>
          {text("label", "Label", { required: true })}
          {text("description", "Help text", { multiline: true })}
          {["text", "email", "phone", "url", "textarea", "number", "select"].includes(type) &&
            text("placeholder", "Placeholder")}
          {type !== "hidden" && (
            <Toggle
              label="Hide the label visually"
              checked={any.hideLabel === true}
              onChange={(v) => update("hideLabel", v || undefined, false)}
            />
          )}

          {(type === "radio" || type === "select" || type === "checkboxes") && (
            <>
              <SectionTitle>Options</SectionTitle>
              <OptionsEditor
                options={(any.options as Option[]) ?? []}
                onChange={(options) => update("options", options)}
              />
            </>
          )}
          {type === "number" && (
            <Stack direction="row" spacing={1}>
              {text("prefix", "Prefix")}
              {text("suffix", "Suffix")}
              <NumberInput
                label="Step"
                value={any.step as number | undefined}
                onChange={(v) => update("step", v)}
              />
            </Stack>
          )}
          {type === "textarea" && (
            <NumberInput
              label="Rows"
              value={any.rows as number | undefined}
              onChange={(v) => update("rows", v)}
            />
          )}
          {type === "boolean" && (
            <TextField
              size="small"
              select
              label="Display"
              value={(any.display as string) ?? "checkbox"}
              onChange={(event) => update("display", event.target.value, false)}
            >
              <MenuItem value="checkbox">Checkbox</MenuItem>
              <MenuItem value="switch">Switch</MenuItem>
              <MenuItem value="yesNo">Yes / No buttons</MenuItem>
            </TextField>
          )}
          {type === "file" && (
            <>
              <Toggle
                label="Allow several files"
                checked={any.multiple === true}
                onChange={(v) => update("multiple", v || undefined, false)}
              />
              <TextField
                size="small"
                label="Accepted types (comma separated)"
                placeholder="application/pdf, image/*"
                value={((any.accept as string[]) ?? []).join(", ")}
                onChange={(event) => {
                  const list = event.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  update("accept", list.length ? list : undefined);
                }}
              />
            </>
          )}
          {(type === "name" || type === "address") && (
            <TextField
              size="small"
              select
              label="Parts"
              slotProps={{ select: { multiple: true } }}
              value={(any.parts as string[]) ?? []}
              onChange={(event) => {
                const parts = event.target.value as unknown as string[];
                update(
                  "parts",
                  parts.length ? PARTS[type]!.filter((p) => parts.includes(p)) : undefined,
                  false,
                );
              }}
              helperText="Empty for the default parts."
            >
              {PARTS[type]!.map((part) => (
                <MenuItem key={part} value={part}>
                  {part}
                </MenuItem>
              ))}
            </TextField>
          )}
          {type === "hidden" && (
            <>
              <TextField
                size="small"
                select
                label="Value type"
                value={(any.valueType as string) ?? "string"}
                onChange={(event) => update("valueType", event.target.value, false)}
              >
                {["string", "number", "boolean", "date", "time", "datetime", "string[]"].map(
                  (t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ),
                )}
              </TextField>
              <JsonInput
                label="Calculation (JSON Logic, optional)"
                value={any.calculate}
                onChange={(v) => update("calculate", v)}
              />
            </>
          )}

          <SectionTitle>Rules</SectionTitle>
          {type !== "hidden" && (
            <ConditionInput
              label="Required"
              value={any.required}
              onChange={(v) => update("required", v, false)}
            />
          )}
          <Toggle
            label="Sensitive (encrypted, masked in the admin)"
            checked={any.sensitive === true}
            onChange={(v) => update("sensitive", v || undefined, false)}
          />
          {validatorTypesFor(type).length > 0 ||
          (any.validators as unknown[] | undefined)?.length ? (
            <ValidatorsEditor
              type={type}
              validators={(any.validators as Validator[]) ?? []}
              onChange={(v) => update("validators", v, false)}
            />
          ) : null}
        </>
      )}

      <SectionTitle>Visibility</SectionTitle>
      <JsonInput
        label="Show only when (JSON Logic, optional)"
        value={any.visible}
        onChange={(v) => update("visible", v)}
        helperText="Empty: always shown. A visual editor follows."
      />
    </Stack>
  );
}

function PageInspector({ page }: { page: number }) {
  const edit = useBuilder((state) => state.edit);
  const current = useBuilder((state) => state.document.pages[page]);
  const { locales, defaultLocale } = useLocales();
  if (!current) return null;
  const update = (property: string, value: unknown, coalesce = true) =>
    edit(
      (draft) => {
        assign(draft.pages[page] as unknown as Any, property, value);
      },
      coalesce ? `page${page}.${property}` : undefined,
    );
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Page {page + 1}</Typography>
      <KeyInput
        value={current.key}
        onChange={(key) => update("key", key)}
        helperText="Identifies the page; not shown to people."
      />
      <LocalizedText
        label="Title"
        value={current.title}
        onChange={(v) => update("title", v)}
        locales={locales}
        defaultLocale={defaultLocale}
      />
      <LocalizedText
        label="Description"
        value={current.description}
        onChange={(v) => update("description", v)}
        locales={locales}
        defaultLocale={defaultLocale}
        multiline
      />
      <JsonInput
        label="Show only when (JSON Logic, optional)"
        value={current.visible}
        onChange={(v) => update("visible", v)}
      />
    </Stack>
  );
}

function OutcomesEditor() {
  const edit = useBuilder((state) => state.edit);
  const outcomes = useBuilder((state) => state.document.submit?.outcomes) ?? [];
  const { locales, defaultLocale } = useLocales();
  const update = (index: number, property: string, value: unknown) =>
    edit((draft) => {
      const target = draft.submit?.outcomes?.[index] as unknown as Any | undefined;
      if (target) assign(target, property, value);
    }, `outcome${index}.${property}`);
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        The first outcome whose condition holds is chosen; the last one usually has no condition.
      </Typography>
      {outcomes.map((outcome: Outcome, index: number) => (
        <Box
          key={index}
          sx={{
            display: "grid",
            gap: 1,
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
              Outcome {index + 1}
            </Typography>
            <IconButton
              size="small"
              aria-label="Remove outcome"
              disabled={outcomes.length <= 1}
              onClick={() =>
                edit((draft) => {
                  draft.submit?.outcomes?.splice(index, 1);
                })
              }
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Stack>
          <KeyInput
            value={outcome.key}
            onChange={(key) => update(index, "key", key)}
            helperText="Stored with each submission."
          />
          <LocalizedText
            label="Message after submitting"
            value={outcome.message}
            onChange={(v) => update(index, "message", v)}
            locales={locales}
            defaultLocale={defaultLocale}
            multiline
          />
          <TextField
            size="small"
            label="Redirect to (optional URL)"
            value={outcome.redirect ?? ""}
            onChange={(event) => update(index, "redirect", event.target.value || undefined)}
          />
          <JsonInput
            label="When (JSON Logic, optional)"
            value={outcome.when}
            onChange={(v) => update(index, "when", v)}
          />
        </Box>
      ))}
      <Button
        size="small"
        startIcon={<Add />}
        sx={{ justifySelf: "start" }}
        onClick={() =>
          edit((draft) => {
            draft.submit ??= {};
            draft.submit.outcomes ??= [];
            let n = draft.submit.outcomes.length + 1;
            while (draft.submit.outcomes.some((o) => o.key === `outcome${n}`)) n++;
            draft.submit.outcomes.push({ key: `outcome${n}` });
          })
        }
      >
        Add outcome
      </Button>
    </Box>
  );
}

function FormInspector() {
  const edit = useBuilder((state) => state.edit);
  const document = useBuilder((state) => state.document);
  const { locales, defaultLocale } = useLocales();
  const update = (property: string, value: unknown) =>
    edit((draft) => {
      assign(draft as unknown as Any, property, value);
    }, `form.${property}`);
  const setting = (property: string, value: unknown) =>
    edit((draft) => {
      draft.settings ??= {};
      assign(draft.settings as Any, property, value);
      if (Object.keys(draft.settings).length === 0) delete draft.settings;
    });
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Form</Typography>
      <TextField
        size="small"
        label="Key"
        value={document.key}
        disabled
        helperText="The key of a form cannot change."
      />
      <LocalizedText
        label="Title"
        value={document.title}
        onChange={(v) => update("title", v ?? "")}
        locales={locales}
        defaultLocale={defaultLocale}
        required
      />
      <LocalizedText
        label="Description"
        value={document.description}
        onChange={(v) => update("description", v)}
        locales={locales}
        defaultLocale={defaultLocale}
        multiline
      />
      <TextField
        size="small"
        select
        label="Navigation"
        value={document.settings?.navigation ?? "paged"}
        onChange={(event) =>
          setting("navigation", event.target.value === "paged" ? undefined : event.target.value)
        }
      >
        <MenuItem value="paged">One page at a time</MenuItem>
        <MenuItem value="single">All pages on one screen</MenuItem>
      </TextField>
      <TextField
        size="small"
        label="Default language"
        value={defaultLocale}
        onChange={(event) => setting("defaultLocale", event.target.value || undefined)}
        helperText="For example en or zh-CN."
      />
      <TextField
        size="small"
        label="Languages (comma separated)"
        value={(document.settings?.locales ?? []).join(", ")}
        onChange={(event) => {
          const list = event.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          setting("locales", list.length ? list : undefined);
        }}
        helperText="Add languages to translate texts; each text gets a Translations section."
      />
      <Divider />
      <SectionTitle>After submitting</SectionTitle>
      <OutcomesEditor />
    </Stack>
  );
}

/** Properties of the selected form, page or element. */
export function Inspector() {
  const selection = useBuilder((state) => state.selection);
  const element = useBuilder((state) =>
    state.selection.kind === "element" ? elementAt(state.document, state.selection.loc) : undefined,
  );
  if (selection.kind === "form") return <FormInspector />;
  if (selection.kind === "page") return <PageInspector page={selection.page} />;
  if (!element) return <Alert severity="info">Select a field to edit it.</Alert>;
  return (
    <ElementInspector
      key={`${selection.loc.page}.${selection.loc.path.join(".")}`}
      loc={selection.loc}
      element={element}
    />
  );
}
