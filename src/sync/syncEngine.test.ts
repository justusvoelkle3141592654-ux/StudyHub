import { beforeEach, describe, expect, it } from "vitest";
import { createTestRepos } from "@/data/__tests__/testDb";
import { configureDataContext } from "@/data/context";
import type { Repositories } from "@/data/repositories";
import { SETTINGS } from "@/app/settingsKeys";
import { NetworkError, type RemoteRow, type SyncRemote } from "./remote";
import { enqueueAllRows, SyncEngine } from "./syncEngine";

/** In-memory stand-in for Supabase: tables keyed by id, rev bumped on every upsert. */
class FakeRemote implements SyncRemote {
  tables = new Map<string, Map<string, RemoteRow>>();
  files = new Map<string, Uint8Array>();
  offline = false;
  failNext: string | null = null;
  calls = 0;
  /** Monotonic server clock for synced_at. */
  private tick = 0;
  private serverNow() {
    this.tick++;
    return new Date(Date.UTC(2026, 8, 18, 0, 0, 0, this.tick)).toISOString();
  }

  private table(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }
  async upsert(table: string, row: Record<string, unknown>): Promise<RemoteRow> {
    this.calls++;
    if (this.offline) throw new NetworkError("offline");
    if (this.failNext === row.id) {
      this.failNext = null;
      throw new Error("server rejected row");
    }
    const t = this.table(table);
    const prev = t.get(row.id as string);
    const stored = { ...(row as object), rev: prev ? prev.rev + 1 : 1, synced_at: this.serverNow() } as RemoteRow;
    t.set(row.id as string, stored);
    return stored;
  }
  async get(table: string, id: string): Promise<RemoteRow | null> {
    if (this.offline) throw new NetworkError("offline");
    return this.table(table).get(id) ?? null;
  }
  async fetchSince(table: string, sinceIso: string | null, limit: number, offset: number): Promise<RemoteRow[]> {
    if (this.offline) throw new NetworkError("offline");
    return [...this.table(table).values()]
      .filter((r) => !sinceIso || r.synced_at > sinceIso)
      .sort((a, b) => a.synced_at.localeCompare(b.synced_at))
      .slice(offset, offset + limit);
  }
  async uploadFile(userId: string, path: string, bytes: Uint8Array): Promise<string> {
    if (this.offline) throw new NetworkError("offline");
    const p = `${userId}/${path}`;
    this.files.set(p, bytes);
    return p;
  }
  async downloadFile(userId: string, path: string): Promise<Uint8Array> {
    return this.files.get(`${userId}/${path}`) ?? this.files.get(path) ?? new Uint8Array();
  }
  /** Simulate another device writing a row directly. */
  async remoteEdit(table: string, id: string, patch: Record<string, unknown>) {
    const t = this.table(table);
    const prev = t.get(id)!;
    t.set(id, { ...prev, ...patch, rev: prev.rev + 1, synced_at: this.serverNow() });
  }
}

let repos: Repositories;
let remote: FakeRemote;
const conflicts: Array<{ table: string; winner: string; copy: string | null }> = [];
const engine = () =>
  new SyncEngine({
    repos,
    remote,
    userId: "user-1",
    onConflict: (table, winner, copy) => conflicts.push({ table, winner, copy }),
    readFileBytes: async () => new Uint8Array([1, 2, 3]),
  });

beforeEach(async () => {
  repos = await createTestRepos();
  configureDataContext({ userId: "user-1", cloudEnabled: true });
  remote = new FakeRemote();
  conflicts.length = 0;
});

describe("SyncEngine", () => {
  it("pushes queued rows, marks them synced and stores the server rev", async () => {
    const n = await repos.notes.insert({ title: "A" });
    const res = await engine().run();
    expect(res.pushed).toBe(1);
    expect(await repos.syncQueue.count()).toBe(0);
    const local = await repos.notes.getById(n.id);
    expect(local?.sync_status).toBe("synced");
    expect(local?.remote_rev).toBe(1);
    const stored = remote.tables.get("notes")!.get(n.id)!;
    expect(stored.user_id).toBe("user-1");
    expect(stored).not.toHaveProperty("sync_status");
  });

  it("pulls rows created elsewhere and advances last_sync_at", async () => {
    await remote.upsert("subjects", { id: "s-remote", user_id: "user-1", created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z", deleted_at: null, name: "Chemie", color: "#000", teacher: null, room: null, sort_order: 0 });
    const res = await engine().run();
    expect(res.pulled).toBe(1);
    const s = await repos.subjects.getById("s-remote");
    expect(s?.name).toBe("Chemie");
    expect(s?.sync_status).toBe("synced");
    expect(s?.remote_rev).toBe(1);
    expect(await repos.settings.get(`${SETTINGS.syncCursorPrefix}subjects`)).toMatch(/^2026-09-18T00:00:00\.\d{3}Z$/);
    expect(await repos.settings.get(SETTINGS.lastSyncAt)).toBeTruthy();
    // Second run pulls nothing new.
    expect((await engine().run()).pulled).toBe(0);
  });

  it("propagates soft deletes to and from the server", async () => {
    const t = await repos.tasks.insert({ title: "del" });
    await engine().run();
    await repos.tasks.softDelete(t.id);
    await engine().run();
    expect(remote.tables.get("tasks")!.get(t.id)!.deleted_at).not.toBeNull();
    // Remote deletion of another row arrives on pull.
    await remote.upsert("tasks", { id: "t2", user_id: "user-1", created_at: "2026-09-11T00:00:00.000Z", updated_at: "2026-09-11T00:00:00.000Z", deleted_at: null, title: "x", description: null, subject_id: null, due_at: null, priority: 2, status: "open", reminder_at: null, recurrence: null, completed_at: null });
    await engine().run();
    expect(await repos.tasks.getById("t2")).not.toBeNull();
    await remote.remoteEdit("tasks", "t2", { deleted_at: "2026-09-12T00:00:00.000Z", updated_at: "2026-09-12T00:00:00.000Z" });
    await engine().run();
    expect(await repos.tasks.getById("t2")).toBeNull();
    expect((await repos.tasks.getById("t2", true))?.deleted_at).toBe("2026-09-12T00:00:00.000Z");
  });

  it("resolves a conflict: newer remote wins, local version kept as copy", async () => {
    const n = await repos.notes.insert({ title: "Notiz", content_markdown: "v1" });
    await engine().run();
    // Local edit (older) …
    await repos.notes.update(n.id, { content_markdown: "lokal" });
    await repos.db.execute("UPDATE notes SET updated_at = ? WHERE id = ?", ["2026-09-18T10:00:00.000Z", n.id]);
    // … and a newer remote edit from another device.
    await remote.remoteEdit("notes", n.id, { content_markdown: "remote", updated_at: "2026-09-18T11:00:00.000Z" });
    const res = await engine().run();
    expect(res.conflicts).toBe(1);
    expect((await repos.notes.getById(n.id))?.content_markdown).toBe("remote");
    const all = await repos.notes.getAll();
    const copy = all.find((x) => x.id !== n.id);
    expect(copy?.title).toMatch(/^Notiz \(Konflikt /);
    expect(copy?.content_markdown).toBe("lokal");
    expect(conflicts[0]).toMatchObject({ table: "notes", winner: "remote" });
    // The copy was pushed too.
    expect(remote.tables.get("notes")!.has(copy!.id)).toBe(true);
  });

  it("resolves a conflict: newer local wins, remote version kept as copy", async () => {
    const n = await repos.notes.insert({ title: "Notiz", content_markdown: "v1" });
    await engine().run();
    await remote.remoteEdit("notes", n.id, { content_markdown: "remote", updated_at: "2026-09-18T09:00:00.000Z" });
    await repos.notes.update(n.id, { content_markdown: "lokal" }); // updated_at = now (newer)
    const res = await engine().run();
    expect(res.conflicts).toBe(1);
    expect(remote.tables.get("notes")!.get(n.id)!.content_markdown).toBe("lokal");
    const copy = (await repos.notes.getAll()).find((x) => x.id !== n.id);
    expect(copy?.content_markdown).toBe("remote");
  });

  it("keeps the queue on network errors and retries later with backoff", async () => {
    await repos.notes.insert({ title: "offline" });
    remote.offline = true;
    const res = await engine().run();
    expect(res.offline).toBe(true);
    expect(await repos.syncQueue.count()).toBe(1);
    const [entry] = await repos.syncQueue.getAll();
    expect(entry.attempts).toBe(0); // network errors do not count as attempts
    remote.offline = false;
    expect((await engine().run()).pushed).toBe(1);
  });

  it("marks an entry as failed after 10 rejected attempts", async () => {
    const n = await repos.notes.insert({ title: "bad" });
    let clock = Date.now();
    const e = new SyncEngine({ repos, remote, userId: "user-1", now: () => new Date(clock) });
    for (let i = 0; i < 10; i++) {
      remote.failNext = n.id;
      await e.run();
      clock += 10 * 60_000; // jump past the backoff
    }
    const failed = await repos.syncQueue.getFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].attempts).toBe(10);
    expect(failed[0].last_error).toBe("server rejected row");
    // Failed entries are not retried automatically.
    remote.failNext = null;
    expect((await e.run()).pushed).toBe(0);
    await repos.syncQueue.retry(failed[0].id);
    expect((await e.run()).pushed).toBe(1);
  });

  it("uploads pending files and records the remote path", async () => {
    const f = await repos.files.insert({ name: "a.txt", local_path: "/tmp/a.txt", upload_status: "pending" });
    const res = await engine().run();
    expect(res.uploaded).toBe(1);
    const stored = await repos.files.getById(f.id);
    expect(stored?.upload_status).toBe("uploaded");
    expect(stored?.remote_path).toBe(`user-1/files/${f.id}/a.txt`);
    expect(remote.files.size).toBe(1);
    expect(await repos.syncQueue.count()).toBe(0);
  });

  it("enqueueAllRows re-queues existing local data when cloud mode is switched on", async () => {
    configureDataContext({ userId: "local", cloudEnabled: false });
    await repos.subjects.insert({ name: "Mathe", color: "#000" });
    await repos.notes.insert({ title: "n" });
    expect(await repos.syncQueue.count()).toBe(0);
    configureDataContext({ userId: "user-1", cloudEnabled: true });
    expect(await enqueueAllRows(repos, "user-1")).toBe(2);
    expect((await repos.subjects.getAll())[0].user_id).toBe("user-1");
    expect((await engine().run()).pushed).toBe(2);
  });
});
