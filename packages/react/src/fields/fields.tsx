import {
  parseAbsoluteToLocal,
  parseDate,
  parseTime,
  type CalendarDate,
  type Time,
  type ZonedDateTime,
} from "@internationalized/date";
import type { JsonValue, Option } from "@formkiln/spec";
import type { ReactNode } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarMonthPicker,
  CalendarYearPicker,
  Checkbox,
  CheckboxGroup,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
  Radio,
  RadioGroup,
  Select,
  SelectValue,
  Switch,
  Text,
  TextArea,
  TextField,
  TimeField,
  type Key,
} from "react-aria-components";
import type { FieldComponent, FieldComponents, FieldProps } from "../types";
import { CompositeField, FileField } from "./complex";

function Description({ children }: { children: string | undefined }) {
  return children ? (
    <Text slot="description" className="fk-description">
      {children}
    </Text>
  ) : null;
}

function Errors({ messages }: { messages: string[] }) {
  return <FieldError className="fk-error">{messages.join(" ")}</FieldError>;
}

function FieldLabel({
  label,
  isRequired,
  optional,
}: {
  label: string;
  isRequired: boolean;
  optional: string;
}) {
  return (
    <Label className="fk-label">
      {label}
      {!isRequired && <span className="fk-optional"> {optional}</span>}
    </Label>
  );
}

const common = (props: FieldProps) => ({
  className: "fk-field",
  isInvalid: props.isInvalid,
  isRequired: props.isRequired,
  isReadOnly: props.isReadOnly,
  validationBehavior: "aria" as const,
  onBlur: props.onBlur,
});

const INPUT_TYPES: Record<string, "text" | "email" | "tel" | "url"> = {
  text: "text",
  email: "email",
  phone: "tel",
  url: "url",
};

export const TextInputField: FieldComponent = (props) => (
  <TextField
    {...common(props)}
    type={INPUT_TYPES[props.field.type] ?? "text"}
    value={typeof props.value === "string" ? props.value : ""}
    onChange={props.onChange}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <Input
      className="fk-input"
      {...(props.placeholder !== undefined && { placeholder: props.placeholder })}
      {...(props.field.autocomplete !== undefined && { autoComplete: props.field.autocomplete })}
    />
    <Errors messages={props.errorMessages} />
  </TextField>
);

export const TextAreaField: FieldComponent = (props) => (
  <TextField
    {...common(props)}
    value={typeof props.value === "string" ? props.value : ""}
    onChange={props.onChange}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <TextArea
      className="fk-input fk-textarea"
      {...(props.placeholder !== undefined && { placeholder: props.placeholder })}
      {...(props.field.type === "textarea" &&
        props.field.rows !== undefined && { rows: props.field.rows })}
    />
    <Errors messages={props.errorMessages} />
  </TextField>
);

export const NumberInputField: FieldComponent = (props) => {
  const field = props.field.type === "number" ? props.field : undefined;
  const prefix = props.text(field?.prefix);
  const suffix = props.text(field?.suffix);
  return (
    <NumberField
      {...common(props)}
      value={typeof props.value === "number" ? props.value : NaN}
      onChange={(value) => props.onChange(Number.isNaN(value) ? null : value)}
      {...(field?.step !== undefined && { step: field.step })}
      formatOptions={{ maximumFractionDigits: 20 }}
    >
      <FieldLabel
        label={props.label}
        isRequired={props.isRequired}
        optional={props.messages.optional}
      />
      <Description>{props.description}</Description>
      <Group className="fk-group">
        {prefix && <span className="fk-affix">{prefix}</span>}
        <Input
          className="fk-input"
          {...(props.placeholder !== undefined && { placeholder: props.placeholder })}
        />
        {suffix && <span className="fk-affix">{suffix}</span>}
      </Group>
      <Errors messages={props.errorMessages} />
    </NumberField>
  );
};

const optionsOf = (props: FieldProps): { value: string; label: string }[] =>
  "options" in props.field
    ? props.field.options.map((option: Option) => ({
        value: option.value,
        label: props.text(option.label) ?? option.value,
      }))
    : [];

export const RadioField: FieldComponent = (props) => (
  <RadioGroup
    {...common(props)}
    className="fk-field fk-choice"
    value={typeof props.value === "string" ? props.value : null}
    onChange={props.onChange}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    {optionsOf(props).map((option) => (
      <Radio key={option.value} value={option.value} className="fk-radio">
        {option.label}
      </Radio>
    ))}
    <Errors messages={props.errorMessages} />
  </RadioGroup>
);

export const CheckboxesField: FieldComponent = (props) => (
  <CheckboxGroup
    {...common(props)}
    className="fk-field fk-choice"
    value={Array.isArray(props.value) ? (props.value as string[]) : []}
    onChange={(value) => props.onChange(value)}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    {optionsOf(props).map((option) => (
      <Checkbox key={option.value} value={option.value} className="fk-checkbox">
        {option.label}
      </Checkbox>
    ))}
    <Errors messages={props.errorMessages} />
  </CheckboxGroup>
);

export const SelectField: FieldComponent = (props) => (
  <Select
    className="fk-field"
    isInvalid={props.isInvalid}
    isRequired={props.isRequired}
    isDisabled={props.isReadOnly}
    validationBehavior="aria"
    onBlur={props.onBlur}
    placeholder={props.placeholder ?? props.messages.selectPlaceholder}
    value={typeof props.value === "string" ? props.value : null}
    onChange={(key) => props.onChange(key === null ? null : String(key))}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <Button className="fk-input fk-select-button">
      <SelectValue />
      <span aria-hidden="true" className="fk-chevron">
        ▾
      </span>
    </Button>
    <Errors messages={props.errorMessages} />
    <Popover className="fk-popover">
      <ListBox className="fk-listbox">
        {optionsOf(props).map((option) => (
          <ListBoxItem
            key={option.value}
            id={option.value}
            textValue={option.label}
            className="fk-option"
          >
            {option.label}
          </ListBoxItem>
        ))}
      </ListBox>
    </Popover>
  </Select>
);

/** A standalone description and error for controls without field slots (checkbox, switch). */
function StandaloneHelp({
  props,
  children,
}: {
  props: FieldProps;
  children: (describedBy: string) => ReactNode;
}) {
  const describedBy = [
    props.description && `${props.id}-description`,
    props.isInvalid && `${props.id}-error`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="fk-field" data-invalid={props.isInvalid || undefined}>
      {children(describedBy)}
      {props.description && (
        <div id={`${props.id}-description`} className="fk-description">
          {props.description}
        </div>
      )}
      {props.isInvalid && (
        <div id={`${props.id}-error`} className="fk-error">
          {props.errorMessages.join(" ")}
        </div>
      )}
    </div>
  );
}

export const BooleanField: FieldComponent = (props) => {
  const display = props.field.type === "boolean" ? (props.field.display ?? "checkbox") : "checkbox";
  if (display === "yesNo") {
    return (
      <RadioGroup
        {...common(props)}
        className="fk-field fk-choice fk-inline"
        value={props.value === true ? "true" : props.value === false ? "false" : null}
        onChange={(value) => props.onChange(value === "true")}
      >
        <FieldLabel
          label={props.label}
          isRequired={props.isRequired}
          optional={props.messages.optional}
        />
        <Description>{props.description}</Description>
        <Radio value="true" className="fk-radio">
          {props.messages.yes}
        </Radio>
        <Radio value="false" className="fk-radio">
          {props.messages.no}
        </Radio>
        <Errors messages={props.errorMessages} />
      </RadioGroup>
    );
  }
  const Control = display === "switch" ? Switch : Checkbox;
  return (
    <StandaloneHelp props={props}>
      {(describedBy) => (
        <Control
          className={display === "switch" ? "fk-switch" : "fk-checkbox"}
          isSelected={props.value === true}
          onChange={props.onChange}
          onBlur={props.onBlur}
          isReadOnly={props.isReadOnly}
          isInvalid={props.isInvalid}
          {...(describedBy && { "aria-describedby": describedBy })}
        >
          {props.label}
        </Control>
      )}
    </StandaloneHelp>
  );
};

function safeParse<T>(parse: (value: string) => T, value: JsonValue): T | null {
  if (typeof value !== "string") return null;
  try {
    return parse(value);
  } catch {
    return null;
  }
}

function CalendarSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: Key;
  onChange: (key: Key | null) => void;
  items: { id: number; formatted: string }[];
}) {
  return (
    <select
      className="fk-calendar-select"
      aria-label={label}
      value={String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.formatted}
        </option>
      ))}
    </select>
  );
}

/** Calendar with month and year pickers, so distant dates (birth dates) are quick to reach. */
function CalendarPopover({ props }: { props: FieldProps }) {
  return (
    <Popover className="fk-popover" placement="bottom end" offset={6}>
      <Dialog className="fk-dialog">
        <Calendar className="fk-calendar">
          <header className="fk-calendar-header">
            <Button
              slot="previous"
              className="fk-calendar-nav"
              aria-label={props.messages.previousMonth}
            >
              ‹
            </Button>
            <div className="fk-calendar-pickers">
              <CalendarMonthPicker format="long">
                {({ "aria-label": label, value, onChange, items }) => (
                  <CalendarSelect label={label} value={value} onChange={onChange} items={items} />
                )}
              </CalendarMonthPicker>
              <CalendarYearPicker visibleYears={101}>
                {({ "aria-label": label, value, onChange, items }) => (
                  <CalendarSelect label={label} value={value} onChange={onChange} items={items} />
                )}
              </CalendarYearPicker>
            </div>
            <Button slot="next" className="fk-calendar-nav" aria-label={props.messages.nextMonth}>
              ›
            </Button>
          </header>
          <Heading className="fk-visually-hidden" />
          <CalendarGrid className="fk-calendar-grid">
            {(date) => <CalendarCell date={date} className="fk-calendar-cell" />}
          </CalendarGrid>
        </Calendar>
      </Dialog>
    </Popover>
  );
}

export const DateField: FieldComponent = (props) => (
  <DatePicker<CalendarDate>
    {...common(props)}
    value={safeParse(parseDate, props.value)}
    onChange={(value) => props.onChange(value ? value.toString() : null)}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <Group className="fk-input fk-group">
      <DateInput className="fk-date-input">
        {(segment) => <DateSegment segment={segment} className="fk-segment" />}
      </DateInput>
      <Button className="fk-icon-button" aria-label={props.messages.chooseDate}>
        ▾
      </Button>
    </Group>
    <Errors messages={props.errorMessages} />
    <CalendarPopover props={props} />
  </DatePicker>
);

export const DateTimeField: FieldComponent = (props) => (
  <DatePicker<ZonedDateTime>
    {...common(props)}
    granularity="minute"
    value={safeParse(parseAbsoluteToLocal, props.value)}
    onChange={(value) => props.onChange(value ? value.toAbsoluteString() : null)}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <Group className="fk-input fk-group">
      <DateInput className="fk-date-input">
        {(segment) => <DateSegment segment={segment} className="fk-segment" />}
      </DateInput>
      <Button className="fk-icon-button" aria-label={props.messages.chooseDate}>
        ▾
      </Button>
    </Group>
    <Errors messages={props.errorMessages} />
    <CalendarPopover props={props} />
  </DatePicker>
);

export const TimeInputField: FieldComponent = (props) => (
  <TimeField<Time>
    {...common(props)}
    value={safeParse(parseTime, props.value)}
    onChange={(value) => props.onChange(value ? value.toString().slice(0, 5) : null)}
  >
    <FieldLabel
      label={props.label}
      isRequired={props.isRequired}
      optional={props.messages.optional}
    />
    <Description>{props.description}</Description>
    <DateInput className="fk-input fk-date-input">
      {(segment) => <DateSegment segment={segment} className="fk-segment" />}
    </DateInput>
    <Errors messages={props.errorMessages} />
  </TimeField>
);

export const UnsupportedField: FieldComponent = (props) => (
  <div className="fk-field fk-unsupported" role="note">
    <span className="fk-label">{props.label}</span>
    <p>{props.messages.unsupported}</p>
  </div>
);

export const defaultComponents: Required<FieldComponents> = {
  text: TextInputField,
  email: TextInputField,
  phone: TextInputField,
  url: TextInputField,
  textarea: TextAreaField,
  number: NumberInputField,
  radio: RadioField,
  select: SelectField,
  checkboxes: CheckboxesField,
  boolean: BooleanField,
  date: DateField,
  time: TimeInputField,
  datetime: DateTimeField,
  name: CompositeField,
  address: CompositeField,
  file: FileField,
  hidden: () => null,
};
