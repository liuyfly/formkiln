/** Helpers for displaying submission answers. */

/** The mask formkiln-server puts in place of sensitive values. */
export const MASK = "••••";

export interface FileRef {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

export function isFileRef(value: unknown): value is FileRef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FileRef).id === "string" &&
    typeof (value as FileRef).contentType === "string"
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Readable form of an answer key: `firstName` → `First name`. */
export function humanize(key: string): string {
  const words = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A short single-line text of a value, for table previews. */
export function previewText(value: unknown): string {
  if (value === null || value === undefined || value === MASK) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.every(isFileRef)) return value.map((file) => file.name).join(", ");
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  return Object.values(value as Record<string, unknown>)
    .filter((part) => typeof part === "string" || typeof part === "number")
    .join(" ");
}
