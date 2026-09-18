import { addDays, format, getISOWeek, startOfWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";
import i18n from "@/i18n";

export function dateLocale() {
  return i18n.language === "en" ? enUS : de;
}

/** YYYY-MM-DD of a local date. */
export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** ISO weekday 1 (Mon) … 7 (Sun). */
export function isoWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export function mondayOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/**
 * A/B week for a date. Odd ISO weeks are "A" by default; `weekAStart`
 * (a YYYY-MM-DD of a Monday in an A week) lets the user shift parity.
 */
export function weekTypeOf(d: Date, weekAStart: string | null): "A" | "B" {
  if (weekAStart) {
    const ref = mondayOf(new Date(`${weekAStart}T00:00:00`));
    const diffWeeks = Math.round((mondayOf(d).getTime() - ref.getTime()) / (7 * 24 * 3600 * 1000));
    return Math.abs(diffWeeks) % 2 === 0 ? "A" : "B";
  }
  return getISOWeek(d) % 2 === 1 ? "A" : "B";
}

export function formatDate(iso: string | Date, pattern = "P"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern, { locale: dateLocale() });
}

export function formatDateTime(iso: string | Date): string {
  return formatDate(iso, "Pp");
}

export function formatWeekday(d: Date, short = false): string {
  return format(d, short ? "EEE" : "EEEE", { locale: dateLocale() });
}

/** Local datetime-local input value (YYYY-MM-DDTHH:mm) from an ISO string. */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/** ISO (UTC) string from a datetime-local input value. */
export function fromLocalInputValue(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function daysFromNow(n: number): Date {
  return addDays(new Date(), n);
}

/** Minutes since midnight of "HH:MM". */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
