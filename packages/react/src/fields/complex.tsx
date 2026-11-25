import type { FileRef, JsonValue } from "@formkiln/spec";
import { useState } from "react";
import { Button, FieldError, FileTrigger, Input, Label, TextField } from "react-aria-components";
import { format } from "../messages";
import type { FieldComponent, FieldProps } from "../types";

const NAME_PARTS = ["given", "family"] as const;
const ADDRESS_PARTS = ["line1", "line2", "city", "postalCode", "country"] as const;
const NAME_REQUIRED = ["given", "family"];
const ADDRESS_REQUIRED = ["line1", "city", "postalCode"];

const AUTOCOMPLETE: Record<string, string> = {
  title: "honorific-prefix",
  given: "given-name",
  middle: "additional-name",
  family: "family-name",
  line1: "address-line1",
  line2: "address-line2",
  city: "address-level2",
  region: "address-level1",
  postalCode: "postal-code",
  country: "country",
};

function Legend({ props }: { props: FieldProps }) {
  return (
    <legend className="fk-label">
      {props.label}
      {!props.isRequired && <span className="fk-optional"> {props.messages.optional}</span>}
    </legend>
  );
}

/** Name and address: one text input per part (Form Schema §6.3). */
export const CompositeField: FieldComponent = (props) => {
  const isName = props.field.type === "name";
  const field =
    props.field.type === "name" || props.field.type === "address" ? props.field : undefined;
  const parts: readonly string[] = field?.parts ?? (isName ? NAME_PARTS : ADDRESS_PARTS);
  const requiredParts: readonly string[] =
    field?.requiredParts ?? (isName ? NAME_REQUIRED : ADDRESS_REQUIRED);
  const labels: Record<string, string> = isName
    ? props.messages.nameParts
    : props.messages.addressParts;
  const value =
    props.value && typeof props.value === "object" && !Array.isArray(props.value)
      ? (props.value as Record<string, JsonValue>)
      : {};
  const fieldErrors = props.fieldErrorMessages;
  const describedBy = [
    props.description && `${props.id}-description`,
    fieldErrors.length > 0 && `${props.id}-error`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      className="fk-field fk-composite"
      onBlur={(event) => {
        // The field counts as visited only when focus leaves all of its parts, so moving
        // from Title to First name does not reveal errors for parts not reached yet.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) props.onBlur();
      }}
      data-invalid={props.isInvalid || undefined}
      {...(describedBy && { "aria-describedby": describedBy })}
    >
      <Legend props={props} />
      {props.description && (
        <div id={`${props.id}-description`} className="fk-description">
          {props.description}
        </div>
      )}
      {fieldErrors.length > 0 && (
        <div id={`${props.id}-error`} className="fk-error">
          {fieldErrors.join(" ")}
        </div>
      )}
      {parts.map((part) => {
        const errors = props.errorsAt(part);
        return (
          <div key={part} data-fk-path={`${props.path}.${part}`}>
            <TextField
              className="fk-field fk-part"
              value={typeof value[part] === "string" ? (value[part] as string) : ""}
              onChange={(text) => props.onChange({ ...value, [part]: text })}
              isInvalid={errors.length > 0 || fieldErrors.length > 0}
              isRequired={props.isRequired && requiredParts.includes(part)}
              isReadOnly={props.isReadOnly}
              validationBehavior="aria"
            >
              <Label className="fk-part-label">{labels[part] ?? part}</Label>
              <Input className="fk-input" autoComplete={AUTOCOMPLETE[part] ?? "off"} />
              <FieldError className="fk-error">{errors.join(" ")}</FieldError>
            </TextField>
          </div>
        );
      })}
    </fieldset>
  );
};

const isFileRef = (value: JsonValue): value is FileRef & { [key: string]: JsonValue } =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof value.id === "string";

function formatSize(bytes: number, locale: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(size);
}

/** File upload through the host's `uploadFile` (Form Schema §6.4). */
export const FileField: FieldComponent = (props) => {
  const field = props.field.type === "file" ? props.field : undefined;
  const multiple = field?.multiple === true;
  const files = Array.isArray(props.value) ? props.value.filter(isFileRef) : [];
  const [uploading, setUploading] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const disabled = !props.uploadFile || props.isReadOnly;
  const describedBy = [
    props.description && `${props.id}-description`,
    props.fieldErrorMessages.length > 0 && `${props.id}-error`,
    !props.uploadFile && `${props.id}-unavailable`,
  ]
    .filter(Boolean)
    .join(" ");

  const select = async (list: FileList | null) => {
    if (!list || !props.uploadFile || !field) return;
    const selected = Array.from(list);
    setFailed([]);
    setUploading(selected.map((file) => file.name));
    const uploaded: FileRef[] = [];
    const errors: string[] = [];
    for (const file of selected) {
      try {
        uploaded.push(await props.uploadFile(file, { field, path: props.path }));
      } catch {
        errors.push(file.name);
      }
    }
    setUploading([]);
    setFailed(errors);
    if (uploaded.length > 0) {
      const next = multiple ? [...files, ...uploaded] : uploaded.slice(-1);
      props.onChange(next as unknown as JsonValue);
    }
    props.onBlur();
  };

  return (
    <div
      className="fk-field fk-file"
      role="group"
      aria-labelledby={`${props.id}-label`}
      data-invalid={props.isInvalid || undefined}
      {...(describedBy && { "aria-describedby": describedBy })}
    >
      <span id={`${props.id}-label`} className="fk-label">
        {props.label}
        {!props.isRequired && <span className="fk-optional"> {props.messages.optional}</span>}
      </span>
      {props.description && (
        <div id={`${props.id}-description`} className="fk-description">
          {props.description}
        </div>
      )}
      {files.length > 0 && (
        <ul className="fk-file-list">
          {files.map((file, index) => {
            const errors = props.errorsAt(String(index));
            return (
              <li
                key={file.id}
                className="fk-file-item"
                data-invalid={errors.length > 0 || undefined}
              >
                <span className="fk-file-name">{file.name}</span>
                <span className="fk-file-size">{formatSize(file.size, props.locale)}</span>
                {!props.isReadOnly && (
                  <Button
                    className="fk-button fk-button-link"
                    aria-label={format(props.messages.removeItem, { item: file.name })}
                    onPress={() => {
                      const next = files.filter((_, i) => i !== index);
                      props.onChange(next.length > 0 ? (next as unknown as JsonValue) : null);
                      props.onBlur();
                    }}
                  >
                    {props.messages.remove}
                  </Button>
                )}
                {errors.length > 0 && <span className="fk-error">{errors.join(" ")}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <FileTrigger
        allowsMultiple={multiple}
        {...(field?.accept && { acceptedFileTypes: field.accept })}
        onSelect={(list) => void select(list)}
      >
        <Button
          className="fk-button fk-button-secondary fk-file-button"
          isDisabled={disabled || uploading.length > 0}
        >
          {multiple ? props.messages.chooseFiles : props.messages.chooseFile}
        </Button>
      </FileTrigger>
      <div aria-live="polite" className="fk-file-status">
        {uploading.map((name) => (
          <div key={name}>{format(props.messages.uploading, { item: name })}</div>
        ))}
      </div>
      {failed.map((name) => (
        <div key={name} className="fk-error" role="alert">
          {format(props.messages.uploadFailed, { item: name })}
        </div>
      ))}
      {!props.uploadFile && (
        <div id={`${props.id}-unavailable`} className="fk-description">
          {props.messages.uploadUnavailable}
        </div>
      )}
      {props.fieldErrorMessages.length > 0 && (
        <div id={`${props.id}-error`} className="fk-error">
          {props.fieldErrorMessages.join(" ")}
        </div>
      )}
    </div>
  );
};
