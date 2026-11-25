"use client";

import Add from "@mui/icons-material/Add";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { JsonInput, NumberInput, textIn } from "./inputs";
import {
  defaultValue,
  groupToLogic,
  NO_VALUE,
  OPERATOR_LABELS,
  operatorsFor,
  parseGroup,
  type FieldRef,
  type Group,
  type Operator,
  type Rule,
} from "./logic";

export type ConditionKind = "visible" | "required" | "when";

const MODES: Record<ConditionKind, { none: string; yes?: string; when: string }> = {
  visible: { none: "Always shown", when: "Shown only when…" },
  required: { none: "No", yes: "Yes", when: "Required only when…" },
  when: { none: "Always", when: "Only when…" },
};

function ValueInput({
  rule,
  field,
  onChange,
  locale,
}: {
  rule: Rule;
  field: FieldRef | undefined;
  onChange: (value: unknown) => void;
  locale: string;
}) {
  if (NO_VALUE.includes(rule.op)) return null;
  const options = field?.options;
  if (rule.op === "anyOf") {
    return (
      <TextField
        size="small"
        select
        label="Values"
        value={Array.isArray(rule.value) ? rule.value : []}
        onChange={(event) => onChange(event.target.value as unknown as string[])}
        slotProps={{ select: { multiple: true } }}
        sx={{ minWidth: 160 }}
        fullWidth={false}
      >
        {(options ?? []).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {textIn(option.label, locale)}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (options && options.length > 0) {
    return (
      <TextField
        size="small"
        select
        label="Value"
        value={String(rule.value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        sx={{ minWidth: 140 }}
        fullWidth={false}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {textIn(option.label, locale)}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (rule.op === "before" || rule.op === "after") {
    const today = rule.value === "today";
    return (
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          select
          label="Date"
          value={today ? "today" : "date"}
          onChange={(event) =>
            onChange(
              event.target.value === "today" ? "today" : new Date().toISOString().slice(0, 10),
            )
          }
          fullWidth={false}
        >
          <MenuItem value="today">today</MenuItem>
          <MenuItem value="date">a date</MenuItem>
        </TextField>
        {!today && (
          <TextField
            size="small"
            type="date"
            label="On"
            value={String(rule.value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth={false}
          />
        )}
      </Stack>
    );
  }
  if (field?.type === "number") {
    return (
      <NumberInput
        label="Value"
        value={typeof rule.value === "number" ? rule.value : undefined}
        onChange={(value) => onChange(value ?? 0)}
      />
    );
  }
  if (field?.type === "date") {
    return (
      <TextField
        size="small"
        type="date"
        label="Date"
        value={String(rule.value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth={false}
      />
    );
  }
  return (
    <TextField
      size="small"
      label="Value"
      value={String(rule.value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 140 }}
      fullWidth={false}
    />
  );
}

function RuleRow({
  rule,
  fields,
  onChange,
  onRemove,
  locale,
}: {
  rule: Rule;
  fields: FieldRef[];
  onChange: (rule: Rule) => void;
  onRemove: () => void;
  locale: string;
}) {
  const field = fields.find((f) => f.path === rule.field);
  const operators = field ? operatorsFor(field.type) : (Object.keys(OPERATOR_LABELS) as Operator[]);
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        p: 1,
        border: 1,
        borderColor: field ? "divider" : "error.main",
        borderRadius: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          size="small"
          select
          label="Field"
          value={rule.field}
          error={!field}
          helperText={field ? undefined : "This field no longer exists."}
          onChange={(event) => {
            const next = fields.find((f) => f.path === event.target.value);
            const op =
              next && operatorsFor(next.type).includes(rule.op)
                ? rule.op
                : (operatorsFor(next?.type ?? "")[0] ?? "notEmpty");
            onChange({
              field: event.target.value,
              op,
              ...(defaultValue(next, op) !== undefined && { value: defaultValue(next, op) }),
            });
          }}
        >
          {!field && <MenuItem value={rule.field}>{rule.field}</MenuItem>}
          {fields.map((f) => (
            <MenuItem key={f.path} value={f.path}>
              {f.label}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, fontFamily: "monospace" }}
              >
                {f.path}
              </Typography>
            </MenuItem>
          ))}
        </TextField>
        <IconButton size="small" aria-label="Remove condition" onClick={onRemove} sx={{ mt: 0.5 }}>
          <DeleteOutlined fontSize="small" />
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <TextField
          size="small"
          select
          label="Condition"
          value={rule.op}
          onChange={(event) => {
            const op = event.target.value as Operator;
            const keep =
              !NO_VALUE.includes(op) &&
              rule.value !== undefined &&
              (op === "anyOf") === Array.isArray(rule.value) &&
              !(["before", "after"].includes(op) !== ["before", "after"].includes(rule.op));
            const value = keep ? rule.value : defaultValue(field, op);
            onChange({ field: rule.field, op, ...(value !== undefined && { value }) });
          }}
          sx={{ minWidth: 150 }}
          fullWidth={false}
        >
          {operators.map((op) => (
            <MenuItem key={op} value={op}>
              {field?.type === "checkboxes" && op === "contains"
                ? "includes"
                : field?.type === "checkboxes" && op === "notContains"
                  ? "does not include"
                  : OPERATOR_LABELS[op]}
            </MenuItem>
          ))}
        </TextField>
        <ValueInput
          rule={rule}
          field={field}
          locale={locale}
          onChange={(value) => onChange({ ...rule, value })}
        />
      </Stack>
    </Box>
  );
}

/**
 * A condition (`visible`, `required` or an outcome's `when`): a mode select, then rules combined
 * with all/any, or JSON Logic for anything the rules cannot express.
 */
export function ConditionEditor({
  kind,
  label,
  value,
  onChange,
  fields,
  locale,
}: {
  kind: ConditionKind;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  fields: FieldRef[];
  locale: string;
}) {
  const modes = MODES[kind];
  const mode =
    value === undefined || value === false
      ? "none"
      : value === true
        ? modes.yes
          ? "yes"
          : "none"
        : "when";
  const group = mode === "when" ? parseGroup(value) : null;
  const [json, setJson] = useState(false);
  const showJson = mode === "when" && (json || !group);

  const setGroup = (next: Group) => onChange(groupToLogic(next) ?? undefined);
  const firstRule = (): Rule => {
    const field = fields[0];
    const op = field ? operatorsFor(field.type)[0]! : "notEmpty";
    const value = defaultValue(field, op);
    return { field: field?.path ?? "", op, ...(value !== undefined && { value }) };
  };

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <TextField
        size="small"
        select
        label={label}
        value={mode}
        onChange={(event) => {
          const next = event.target.value;
          setJson(false);
          if (next === "none") onChange(undefined);
          else if (next === "yes") onChange(true);
          else
            onChange(
              fields.length
                ? groupToLogic({ combinator: "and", rules: [firstRule()] })
                : { "==": [true, true] },
            );
        }}
      >
        <MenuItem value="none">{modes.none}</MenuItem>
        {modes.yes && <MenuItem value="yes">{modes.yes}</MenuItem>}
        <MenuItem value="when" disabled={fields.length === 0 && mode !== "when"}>
          {modes.when}
          {fields.length === 0 && mode !== "when" ? " (add fields first)" : ""}
        </MenuItem>
      </TextField>

      {mode === "when" && !showJson && group && (
        <Box sx={{ display: "grid", gap: 1, pl: 1, borderLeft: 2, borderColor: "primary.light" }}>
          {group.rules.length > 1 && (
            <TextField
              size="small"
              select
              value={group.combinator}
              onChange={(event) =>
                setGroup({ ...group, combinator: event.target.value as "and" | "or" })
              }
              aria-label="Combine conditions"
            >
              <MenuItem value="and">All of these are true</MenuItem>
              <MenuItem value="or">Any of these is true</MenuItem>
            </TextField>
          )}
          {group.rules.map((rule, index) => (
            <RuleRow
              key={index}
              rule={rule}
              fields={fields}
              locale={locale}
              onChange={(next) =>
                setGroup({ ...group, rules: group.rules.map((r, i) => (i === index ? next : r)) })
              }
              onRemove={() => {
                const rules = group.rules.filter((_, i) => i !== index);
                if (rules.length === 0) onChange(undefined);
                else setGroup({ ...group, rules });
              }}
            />
          ))}
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setGroup({ ...group, rules: [...group.rules, firstRule()] })}
              disabled={fields.length === 0}
            >
              Add condition
            </Button>
            <Link component="button" type="button" variant="caption" onClick={() => setJson(true)}>
              Edit as JSON
            </Link>
          </Stack>
        </Box>
      )}

      {showJson && (
        <>
          {!group && (
            <Alert severity="info">
              This condition is more than the visual editor can show; edit it as JSON Logic.
            </Alert>
          )}
          <JsonInput
            label={`${label} (JSON Logic)`}
            value={value}
            onChange={(next) => onChange(next)}
          />
          {group && (
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={() => setJson(false)}
              sx={{ justifySelf: "start" }}
            >
              Use the visual editor
            </Link>
          )}
        </>
      )}
    </Box>
  );
}
