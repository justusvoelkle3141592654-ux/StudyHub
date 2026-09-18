import { describe, expect, it } from "vitest";
import { nextOccurrence, parseRecurrence, serializeRecurrence } from "./recurrence";

describe("recurrence", () => {
  it("round-trips and validates", () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence("nope")).toBeNull();
    expect(parseRecurrence('{"freq":"yearly"}')).toBeNull();
    expect(parseRecurrence(serializeRecurrence({ freq: "weekly", interval: 2 }))).toEqual({ freq: "weekly", interval: 2 });
    expect(parseRecurrence('{"freq":"daily","interval":0}')?.interval).toBe(1);
  });
  it("computes the next occurrence", () => {
    const d = new Date("2026-01-31T10:00:00Z");
    expect(nextOccurrence(d, { freq: "daily", interval: 3 }).toISOString()).toBe("2026-02-03T10:00:00.000Z");
    expect(nextOccurrence(d, { freq: "weekly", interval: 1 }).toISOString()).toBe("2026-02-07T10:00:00.000Z");
    expect(nextOccurrence(d, { freq: "monthly", interval: 1 }).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });
});
