/** Calendar date helpers for `YYYY-MM-DD` values (operators-v1 §8). */

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export type DateUnit = "day" | "week" | "month" | "year";

export function isDateUnit(value: unknown): value is DateUnit {
  return value === "day" || value === "week" || value === "month" || value === "year";
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

/** Parses a valid calendar date between 0001-01-01 and 9999-12-31, or returns null. */
export function parseDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

function formatDate({ year, month, day }: CalendarDate): string | null {
  if (year < 1 || year > 9999) return null;
  const pad = (n: number, width: number) => String(n).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function toEpochDay({ year, month, day }: CalendarDate): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return Math.round(date.getTime() / MS_PER_DAY);
}

function fromEpochDay(epochDay: number): CalendarDate {
  const date = new Date(epochDay * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Months since year 0, as in java.time's proleptic month. */
function prolepticMonth({ year, month }: CalendarDate): number {
  return year * 12 + month - 1;
}

export function addToDate(date: CalendarDate, amount: number, unit: DateUnit): string | null {
  if (unit === "day" || unit === "week") {
    return formatDate(fromEpochDay(toEpochDay(date) + amount * (unit === "week" ? 7 : 1)));
  }
  const total = prolepticMonth(date) + amount * (unit === "year" ? 12 : 1);
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  if (year < 1 || year > 9999) return null;
  return formatDate({ year, month, day: Math.min(date.day, daysInMonth(year, month)) });
}

/** Complete units from `from` to `to`, following java.time.LocalDate#until. */
export function diffDates(from: CalendarDate, to: CalendarDate, unit: DateUnit): number {
  if (unit === "day" || unit === "week") {
    const days = toEpochDay(to) - toEpochDay(from);
    return unit === "day" ? days : Math.trunc(days / 7);
  }
  let months = prolepticMonth(to) - prolepticMonth(from);
  const days = to.day - from.day;
  if (months > 0 && days < 0) months--;
  else if (months < 0 && days > 0) months++;
  const result = unit === "year" ? Math.trunc(months / 12) : months;
  return result === 0 ? 0 : result;
}

/** The calendar date of `instant` in `timeZone`, or null if the time zone is unknown. */
export function todayIn(instant: Date, timeZone: string): string | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
  } catch {
    return null;
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return formatDate({ year: get("year"), month: get("month"), day: get("day") });
}
