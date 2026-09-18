import { describe, expect, it } from "vitest";
import { backoffMs, resolveConflict } from "./conflicts";

const base = {
  id: "row-1",
  user_id: "u1",
  created_at: "2026-09-01T10:00:00.000Z",
  deleted_at: null,
  sync_status: "pending" as const,
  remote_rev: 3,
};
const rest = { rev: 1, synced_at: "2026-09-18T12:00:00.000Z" };

describe("resolveConflict", () => {
  it("newer local version wins and the remote version is kept as a copy", () => {
    const local = { ...base, updated_at: "2026-09-18T12:00:00.000Z", title: "Meine Notiz", content_markdown: "lokal" };
    const remote = { ...base, ...rest, updated_at: "2026-09-18T11:00:00.000Z", rev: 4, title: "Meine Notiz", content_markdown: "remote" };
    const res = resolveConflict("notes", local, remote, "copy-id", new Date("2026-09-18T12:30:00Z"));
    expect(res.winner).toBe("local");
    expect(res.loserCopy).toMatchObject({ id: "copy-id", title: "Meine Notiz (Konflikt 2026-09-18)", content_markdown: "remote", deleted_at: null });
    expect(res.loserCopy).not.toHaveProperty("rev");
  });

  it("newer remote version wins and the local version is kept as a copy", () => {
    const local = { ...base, updated_at: "2026-09-18T10:00:00.000Z", title: "Aufgabe", status: "open" };
    const remote = { ...base, ...rest, updated_at: "2026-09-18T11:00:00.000Z", rev: 4, title: "Aufgabe", status: "done" };
    const res = resolveConflict("tasks", local, remote, "copy-id");
    expect(res.winner).toBe("remote");
    expect(res.loserCopy?.status).toBe("open");
    expect(String(res.loserCopy?.title)).toMatch(/^Aufgabe \(Konflikt \d{4}-\d{2}-\d{2}\)$/);
  });

  it("ties go to the remote side; tables without a title get no copy; deleted losers get no copy", () => {
    const local = { ...base, updated_at: "2026-09-18T10:00:00.000Z", weekday: 1 };
    const remote = { ...base, ...rest, updated_at: "2026-09-18T10:00:00.000Z", rev: 4, weekday: 2 };
    expect(resolveConflict("timetable_slots", local, remote, "x")).toEqual({ winner: "remote", loserCopy: null });
    // Local deleted the note (older), remote edited it later: remote wins, the deleted loser is not copied.
    const deletedLocal = { ...base, updated_at: "2026-09-18T09:00:00.000Z", deleted_at: "2026-09-18T09:00:00.000Z", title: "gone" };
    const res = resolveConflict("notes", deletedLocal, { ...remote, title: "x" }, "x");
    expect(res.winner).toBe("remote");
    expect(res.loserCopy).toBeNull();
  });

  it("uses a custom suffix (localised)", () => {
    const local = { ...base, updated_at: "2026-09-18T12:00:00.000Z", title: "A" };
    const remote = { ...base, ...rest, updated_at: "2026-09-18T11:00:00.000Z", rev: 1, title: "B" };
    const res = resolveConflict("notes", local, remote, "c", new Date("2026-01-02T00:00:00Z"), (d) => ` (conflict ${d})`);
    expect(res.loserCopy?.title).toBe("B (conflict 2026-01-02)");
  });
});

describe("backoffMs", () => {
  it("doubles from one second and caps at five minutes", () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(8)).toBe(256_000);
    expect(backoffMs(9)).toBe(300_000);
    expect(backoffMs(20)).toBe(300_000);
  });
});
