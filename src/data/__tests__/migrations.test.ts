import { describe, expect, it } from "vitest";
import { SqlJsAdapter } from "../db/sqljsAdapter";
import { loadBundledMigrations, parseMigration, runMigrations, splitStatements } from "../db/migrations";

describe("splitStatements", () => {
  it("splits simple statements and ignores comments", () => {
    const out = splitStatements("-- comment\nCREATE TABLE a (x);\nINSERT INTO a VALUES ('a;b'); -- trailing\n");
    expect(out).toEqual(["CREATE TABLE a (x)", "INSERT INTO a VALUES ('a;b')"]);
  });

  it("keeps trigger bodies intact", () => {
    const sql = `CREATE TRIGGER t AFTER INSERT ON a BEGIN
  INSERT INTO b VALUES (new.x);
  INSERT INTO c VALUES (new.x);
END;
SELECT 1;`;
    const out = splitStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatch(/^CREATE TRIGGER/);
    expect(out[0]).toMatch(/END$/);
    expect(out[1]).toBe("SELECT 1");
  });
});

describe("parseMigration", () => {
  it("extracts version, name and requirements", () => {
    const m = parseMigration("0007_add_fts.sql", "-- @requires fts5\nSELECT 1;");
    expect(m.version).toBe(7);
    expect(m.name).toBe("add_fts");
    expect(m.requires).toEqual(["fts5"]);
  });
});

describe("runMigrations", () => {
  it("applies bundled migrations once and records them", async () => {
    const db = await SqlJsAdapter.create();
    const first = await runMigrations(db);
    expect(first.applied.length + first.skipped.length).toBe(loadBundledMigrations().length);
    expect(first.applied).toContain(1);
    const tables = await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const names = tables.map((t) => t.name);
    for (const t of [
      "subjects",
      "timetable_slots",
      "tasks",
      "exams",
      "notes",
      "note_tags",
      "flashcard_decks",
      "flashcards",
      "grades",
      "folders",
      "files",
      "documents",
      "settings",
      "sync_queue",
      "schema_migrations",
    ]) {
      expect(names).toContain(t);
    }
    const second = await runMigrations(db);
    expect(second.applied).toEqual([]);
  });

  it("skips migrations whose requirements the engine lacks", async () => {
    const db = await SqlJsAdapter.create();
    expect(db.capabilities.fts5).toBe(false);
    const res = await runMigrations(db, [
      { version: 1, name: "a", sql: "CREATE TABLE a (x)", requires: [] },
      { version: 2, name: "b", sql: "CREATE VIRTUAL TABLE b USING fts5(x)", requires: ["fts5"] },
    ]);
    expect(res.applied).toEqual([1]);
    expect(res.skipped).toEqual([2]);
    const rows = await db.select<{ version: number; skipped: number }>("SELECT version, skipped FROM schema_migrations ORDER BY version");
    expect(rows).toEqual([
      { version: 1, skipped: 0 },
      { version: 2, skipped: 1 },
    ]);
  });

  it("rolls back a failing migration and reports it", async () => {
    const db = await SqlJsAdapter.create();
    await expect(
      runMigrations(db, [{ version: 1, name: "bad", sql: "CREATE TABLE ok (x); CREATE TABLE ok (x);", requires: [] }]),
    ).rejects.toThrow(/Migration 1_bad failed/);
    const tables = await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='ok'");
    expect(tables).toHaveLength(0);
    const rows = await db.select("SELECT * FROM schema_migrations");
    expect(rows).toHaveLength(0);
  });

  it("all bundled migrations have unique, increasing versions and sync columns on content tables", async () => {
    const migrations = loadBundledMigrations();
    const versions = migrations.map((m) => m.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));

    const db = await SqlJsAdapter.create();
    await runMigrations(db);
    const tables = await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('settings','sync_queue','schema_migrations') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'",
    );
    for (const t of tables) {
      const cols = await db.select<{ name: string }>(`PRAGMA table_info(${t.name})`);
      const names = cols.map((c) => c.name);
      for (const c of ["id", "user_id", "created_at", "updated_at", "deleted_at", "sync_status", "remote_rev"]) {
        expect(names, `${t.name} lacks ${c}`).toContain(c);
      }
      const idx = await db.select<{ name: string; sql: string }>(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${t.name}'`);
      expect(idx.some((i) => /updated_at/.test(i.sql ?? "")), `${t.name} lacks updated_at index`).toBe(true);
    }
  });
});
