/**
 * SM-2 spaced repetition (SuperMemo 2), implemented as a pure function.
 *
 * Quality scale (0–5):
 *   5 perfect, 4 correct after hesitation, 3 correct with difficulty,
 *   2 wrong but remembered on seeing the answer, 1 wrong, 0 blackout.
 *
 * Intensity adjusts the schedule: "relaxed" stretches intervals, "intensive"
 * shortens them; new cards also start with a different ease factor.
 */
import type { ReviewIntensity } from "@/features/setup/types";

export interface Sm2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  /** Due date as YYYY-MM-DD, computed from `today`. */
  due_date: string;
  /** True when the answer counted as a lapse (quality < 3). */
  lapse: boolean;
}

export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 36500; // 100 years: guards against overflow on absurd inputs

const INTERVAL_MODIFIER: Record<ReviewIntensity, number> = { relaxed: 1.3, normal: 1, intensive: 0.7 };
const START_EASE: Record<ReviewIntensity, number> = { relaxed: 2.7, normal: 2.5, intensive: 2.3 };

export function startingEase(intensity: ReviewIntensity): number {
  return START_EASE[intensity];
}

export function sm2(state: Sm2State, quality: number, options: { intensity?: ReviewIntensity; today?: Date } = {}): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const intensity = options.intensity ?? "normal";
  const today = options.today ?? new Date();

  let ease = Number.isFinite(state.ease_factor) && state.ease_factor > 0 ? state.ease_factor : 2.5;
  let repetitions = Math.max(0, Math.floor(state.repetitions));
  let interval: number;
  let lapse = false;

  if (q >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(Math.max(1, state.interval_days) * ease);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
    lapse = true;
  }

  // Ease update applies for every answer (as in the original algorithm).
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  interval = Math.round(interval * INTERVAL_MODIFIER[intensity]);
  interval = Math.min(MAX_INTERVAL_DAYS, Math.max(1, interval));

  const due = new Date(today);
  due.setDate(due.getDate() + interval);

  return {
    ease_factor: Math.round(ease * 1000) / 1000,
    interval_days: interval,
    repetitions,
    due_date: toDateKey(due),
    lapse,
  };
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
