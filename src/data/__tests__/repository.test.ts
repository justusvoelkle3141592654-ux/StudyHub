import { beforeEach, describe, expect, it } from "vitest";
import { createTestRepos } from "./testDb";
import { configureDataContext } from "../context";
import type { Repositories } from "../repositories";

let repos: Repositories;

beforeEach(async () => {
  repos = await createTestRepos();
});

describe("BaseRepository", () => {
  it("generates sync fields on insert", async () => {
    const s = await repos.subjects.insert({ name: "Mathe", color: "#ff0000", teacher: null, room: null, sort_order: 0 });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.user_id).toBe("local");
    expect(s.created_at).toBe(s.updated_at);
    expect(s.deleted_at).toBeNull();
    expect(s.sync_status).toBe("local");
    expect(s.remote_rev).toBeNull();
    const loaded = await repos.subjects.getById(s.id);
    expect(loaded?.name).toBe("Mathe");
  });

  it("bumps updated_at on update", async () => {
    const s = await repos.subjects.insert({ name: "Bio", color: "#0f0", teacher: null, room: null, sort_order: 0 });
    await new Promise((r) => setTimeout(r, 5));
    const u = await repos.subjects.update(s.id, { name: "Biologie" });
    expect(u.name).toBe("Biologie");
    expect(u.updated_at > s.updated_at).toBe(true);
    expect(u.created_at).toBe(s.created_at);
  });

  it("soft deletes and hides rows by default", async () => {
    const s = await repos.subjects.insert({ name: "Chemie", color: "#00f", teacher: null, room: null, sort_order: 0 });
    await repos.subjects.softDelete(s.id);
    expect(await repos.subjects.getById(s.id)).toBeNull();
    const raw = await repos.subjects.getById(s.id, true);
    expect(raw?.deleted_at).not.toBeNull();
    expect(await repos.subjects.getAll()).toHaveLength(0);
    await repos.subjects.restore(s.id);
    expect(await repos.subjects.getAll()).toHaveLength(1);
  });

  it("never issues physical deletes on content tables", async () => {
    const s = await repos.subjects.insert({ name: "X", color: "#000", teacher: null, room: null, sort_order: 0 });
    await repos.subjects.softDelete(s.id);
    const rows = await repos.db.select<{ n: number }>("SELECT COUNT(*) AS n FROM subjects");
    expect(Number(rows[0].n)).toBe(1);
  });

  it("does not enqueue in local mode", async () => {
    await repos.tasks.insert({ title: "T", description: null, subject_id: null, due_at: null, priority: 2, status: "open", reminder_at: null, recurrence: null, completed_at: null });
    expect(await repos.syncQueue.count()).toBe(0);
  });

  it("enqueues upsert/delete entries in cloud mode and marks rows pending", async () => {
    configureDataContext({ userId: "user-1", cloudEnabled: true });
    const t = await repos.tasks.insert({ title: "Cloud", description: null, subject_id: null, due_at: null, priority: 1, status: "open", reminder_at: null, recurrence: null, completed_at: null });
    expect(t.sync_status).toBe("pending");
    expect(t.user_id).toBe("user-1");
    let queue = await repos.syncQueue.getAll();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("upsert");
    expect(JSON.parse(queue[0].payload_json).title).toBe("Cloud");

    await repos.tasks.update(t.id, { title: "Cloud 2" });
    queue = await repos.syncQueue.getAll();
    // earlier entry for the same row is collapsed into the latest one
    expect(queue).toHaveLength(1);
    expect(JSON.parse(queue[0].payload_json).title).toBe("Cloud 2");

    await repos.tasks.softDelete(t.id);
    queue = await repos.syncQueue.getAll();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("delete");
    configureDataContext({ userId: "local", cloudEnabled: false });
  });

  it("markSynced and upsertFromRemote do not enqueue", async () => {
    configureDataContext({ userId: "user-1", cloudEnabled: true });
    const n = await repos.notes.insert({ title: "N", content_markdown: "x", subject_id: null, folder_id: null, is_pinned: 0 });
    const q = await repos.syncQueue.getAll();
    await repos.syncQueue.remove(q[0].id);
    await repos.notes.markSynced(n.id, 7);
    const synced = await repos.notes.getById(n.id);
    expect(synced?.sync_status).toBe("synced");
    expect(synced?.remote_rev).toBe(7);
    await repos.notes.upsertFromRemote({ ...n, title: "Remote", remote_rev: 8, sync_status: "synced" });
    expect((await repos.notes.getById(n.id))?.title).toBe("Remote");
    expect(await repos.syncQueue.count()).toBe(0);
    configureDataContext({ userId: "local", cloudEnabled: false });
  });
});

describe("SettingsRepository", () => {
  it("stores and reads JSON values", async () => {
    await repos.settings.set("profile", "school");
    await repos.settings.setMany({ a: 1, b: { c: true } });
    expect(await repos.settings.get("profile")).toBe("school");
    expect(await repos.settings.get("b")).toEqual({ c: true });
    expect(await repos.settings.get("missing")).toBeNull();
    await repos.settings.remove("a");
    expect(await repos.settings.get("a")).toBeNull();
  });
});

describe("NoteRepository", () => {
  it("searches by LIKE fallback without FTS5 and manages tags", async () => {
    const n = await repos.notes.insert({ title: "Photosynthese", content_markdown: "Chlorophyll absorbiert Licht", subject_id: null, folder_id: null, is_pinned: 0 });
    await repos.notes.insert({ title: "Anderes", content_markdown: "nichts", subject_id: null, folder_id: null, is_pinned: 0 });
    const hits = await repos.notes.search("chloro");
    expect(hits.map((h) => h.id)).toEqual([n.id]);
    await repos.noteTags.setTags(n.id, ["bio", "wichtig"]);
    expect((await repos.noteTags.getForNote(n.id)).map((t) => t.tag)).toEqual(["bio", "wichtig"]);
    await repos.noteTags.setTags(n.id, ["bio"]);
    expect((await repos.noteTags.getForNote(n.id)).map((t) => t.tag)).toEqual(["bio"]);
    expect(await repos.noteTags.getAllTags()).toEqual(["bio"]);
  });
});
