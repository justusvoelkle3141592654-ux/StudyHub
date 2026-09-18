import { isTauri } from "@/platform";
import { log } from "@/lib/logger";
import type { DbAdapter } from "./adapter";
import { loadBundledMigrations, runMigrations, type MigrationResult } from "./migrations";
import { Repositories } from "../repositories";

export const DB_FILE_NAME = "studyhub.db";
export const STORE_KEY_DB_PATH = "dbPath";

export interface OpenedDatabase {
  db: DbAdapter;
  repos: Repositories;
  migration: MigrationResult;
  /** Absolute path of the database file (Tauri) or `browser`. */
  location: string;
}

let current: OpenedDatabase | null = null;

export function getDatabase(): OpenedDatabase {
  if (!current) throw new Error("Database has not been opened yet");
  return current;
}

export function getRepos(): Repositories {
  return getDatabase().repos;
}

export function isDatabaseOpen(): boolean {
  return current !== null;
}

/**
 * Open the local database and apply pending migrations.
 *
 * Tauri: the file lives in the app data directory unless the user chose a
 * different location in the setup wizard (stored under `dbPath`). Before any
 * migration runs a copy of the file is written to `migration-backups/`; if
 * the migration fails the copy is restored and the error is re-thrown.
 *
 * Browser (development / tests): sql.js in memory, persisted to IndexedDB.
 */
export async function openDatabase(): Promise<OpenedDatabase> {
  if (current) return current;
  current = isTauri() ? await openTauriDatabase() : await openBrowserDatabase();
  log.info("db", `database ready at ${current.location} (schema v${current.migration.currentVersion})`);
  return current;
}

export async function closeDatabase(): Promise<void> {
  if (!current) return;
  await current.db.close();
  current = null;
}

async function openBrowserDatabase(): Promise<OpenedDatabase> {
  const { SqlJsAdapter } = await import("./sqljsAdapter");
  const persistence = typeof indexedDB !== "undefined" ? await import("./browserPersistence") : null;
  const initial = persistence ? await persistence.loadImage() : null;
  const db = await SqlJsAdapter.create({ initial, persist: persistence ? persistence.saveImage : null });
  const migration = await runMigrations(db);
  return { db, repos: new Repositories(db), migration, location: "browser" };
}

/** Resolve where the database file should live. */
export async function resolveDatabasePath(): Promise<string> {
  const { getAppStore, appDataDirectory, joinPath } = await import("@/platform/native");
  const store = await getAppStore();
  const custom = await store.get<string>(STORE_KEY_DB_PATH);
  if (custom) return custom;
  return joinPath(await appDataDirectory(), DB_FILE_NAME);
}

async function openTauriDatabase(): Promise<OpenedDatabase> {
  const { TauriSqlAdapter } = await import("./tauriAdapter");
  const { native, joinPath } = await import("@/platform/native");
  const path = await resolveDatabasePath();
  const dir = path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
  await native.setAllowedRoots([dir]);
  await native.mkdir(dir);

  const existed = await native.exists(path);
  let db = await TauriSqlAdapter.open(path);

  // Determine whether a migration is pending; back up first if so.
  const applied = await db.select<{ version: number }>(
    "SELECT version FROM sqlite_master WHERE 0 UNION ALL SELECT version FROM schema_migrations WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations')",
  ).catch(() => [] as { version: number }[]);
  const appliedSet = new Set(applied.map((r) => Number(r.version)));
  const pending = loadBundledMigrations().some((m) => !appliedSet.has(m.version));

  let backupPath: string | null = null;
  if (existed && pending) {
    await db.close();
    const backupDir = await joinPath(dir, "migration-backups");
    await native.mkdir(backupDir);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = await joinPath(backupDir, `studyhub-pre-migration-${stamp}.db`);
    await native.copyFile(path, backupPath);
    log.info("db", `backup written before migration: ${backupPath}`);
    db = await TauriSqlAdapter.open(path);
  }

  let migration: MigrationResult;
  try {
    migration = await runMigrations(db);
  } catch (e) {
    log.error("db", "migration failed, restoring backup", e);
    await db.close().catch(() => undefined);
    if (backupPath) {
      await native.copyFile(backupPath, path);
      log.info("db", "database restored from backup");
    }
    throw e;
  }
  return { db, repos: new Repositories(db), migration, location: path };
}
