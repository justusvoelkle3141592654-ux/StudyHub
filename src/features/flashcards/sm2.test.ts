import { describe, expect, it } from "vitest";
import { MAX_INTERVAL_DAYS, MIN_EASE, sm2, startingEase } from "./sm2";

const today = new Date(2026, 8, 18); // 18 Sep 2026 (local)
const fresh = { ease_factor: 2.5, interval_days: 0, repetitions: 0 };

describe("sm2", () => {
  it("first review: correct answer schedules 1 day, second correct 6 days", () => {
    const first = sm2(fresh, 4, { today });
    expect(first.interval_days).toBe(1);
    expect(first.repetitions).toBe(1);
    expect(first.due_date).toBe("2026-09-19");
    expect(first.lapse).toBe(false);
    expect(first.ease_factor).toBe(2.5); // quality 4 keeps the ease factor

    const second = sm2(first, 5, { today });
    expect(second.interval_days).toBe(6);
    expect(second.repetitions).toBe(2);
    expect(second.ease_factor).toBeCloseTo(2.6, 3);

    const third = sm2(second, 4, { today });
    expect(third.interval_days).toBe(Math.round(6 * 2.6));
    expect(third.repetitions).toBe(3);
  });

  it("lapse: a bad answer resets repetitions and interval, lowers ease, never below 1.3", () => {
    const mature = { ease_factor: 2.5, interval_days: 40, repetitions: 5 };
    const lapsed = sm2(mature, 1, { today });
    expect(lapsed.lapse).toBe(true);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval_days).toBe(1);
    expect(lapsed.ease_factor).toBeCloseTo(2.5 - 0.54, 3);

    let s = { ...mature, ease_factor: 1.4 };
    for (let i = 0; i < 5; i++) s = sm2(s, 0, { today });
    expect(s.ease_factor).toBe(MIN_EASE);
  });

  it("quality 3 keeps the card but reduces ease slightly", () => {
    const r = sm2({ ease_factor: 2.5, interval_days: 6, repetitions: 2 }, 3, { today });
    expect(r.lapse).toBe(false);
    expect(r.ease_factor).toBeCloseTo(2.36, 3);
    expect(r.interval_days).toBe(15);
  });

  it("very long intervals are capped and never overflow", () => {
    const r = sm2({ ease_factor: 2.5, interval_days: 1e9, repetitions: 50 }, 5, { today });
    expect(r.interval_days).toBe(MAX_INTERVAL_DAYS);
    expect(r.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const r2 = sm2({ ease_factor: Number.NaN, interval_days: -5, repetitions: -1 }, 4, { today });
    expect(r2.interval_days).toBe(1);
    expect(r2.repetitions).toBe(1);
  });

  it("intensity scales intervals and starting ease", () => {
    const base = { ease_factor: 2.5, interval_days: 10, repetitions: 3 };
    expect(sm2(base, 4, { today, intensity: "relaxed" }).interval_days).toBe(Math.round(25 * 1.3));
    expect(sm2(base, 4, { today, intensity: "intensive" }).interval_days).toBe(Math.round(25 * 0.7));
    expect(sm2(fresh, 4, { today, intensity: "intensive" }).interval_days).toBe(1);
    expect(startingEase("relaxed")).toBeGreaterThan(startingEase("intensive"));
  });

  it("clamps out-of-range quality", () => {
    expect(sm2(fresh, 9, { today }).repetitions).toBe(1);
    expect(sm2(fresh, -3, { today }).lapse).toBe(true);
  });
});
