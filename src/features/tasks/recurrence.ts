import { addDays, addMonths, addWeeks } from "date-fns";
import type { RecurrenceFrequency } from "@/data/types";

export interface Recurrence {
  freq: RecurrenceFrequency;
  interval: number;
}

export function parseRecurrence(raw: string | null): Recurrence | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<Recurrence>;
    if (r.freq && ["daily", "weekly", "monthly"].includes(r.freq)) {
      return { freq: r.freq, interval: Math.max(1, Number(r.interval) || 1) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function serializeRecurrence(r: Recurrence | null): string | null {
  return r ? JSON.stringify(r) : null;
}

/** Next due date after `from` according to the rule (pure). */
export function nextOccurrence(from: Date, r: Recurrence): Date {
  switch (r.freq) {
    case "daily":
      return addDays(from, r.interval);
    case "weekly":
      return addWeeks(from, r.interval);
    case "monthly":
      return addMonths(from, r.interval);
  }
}
