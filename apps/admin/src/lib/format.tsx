const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : "—";
}

/**
 * A timestamp in the viewer's locale and time zone. The server renders its own locale first, so
 * the text may change on hydration.
 */
export function DateTime({ value }: { value: string | null | undefined }) {
  return (
    <time dateTime={value ?? undefined} suppressHydrationWarning>
      {formatDateTime(value)}
    </time>
  );
}
