import { isTauri } from "@/platform";
import { getDatabase } from "@/data/db";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting, useSettingsStore } from "@/stores/settingsStore";
import { todayKey } from "@/lib/dates";
import { log } from "@/lib/logger";
import { getWorkingFolder } from "@/features/files/fileService";

export const BACKUP_KEEP = 14;
const BACKUP_PREFIX = "studyhub-";

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  modified_ms: number | null;
}

/** Copy the database file to `<working>/backups/studyhub-YYYY-MM-DD.db` and prune old copies. */
export async function createBackup(): Promise<string | null> {
  if (!isTauri()) return null;
  const { native, joinPath } = await import("@/platform/native");
  const dbPath = getDatabase().location;
  const dir = await joinPath(await getWorkingFolder(), "backups");
  await native.mkdir(dir);
  const target = await joinPath(dir, `${BACKUP_PREFIX}${todayKey()}.db`);
  // Flush WAL content into the main file first so the copy is complete.
  await getDatabase().db.execute("PRAGMA wal_checkpoint(TRUNCATE)").catch(() => undefined);
  await native.copyFile(dbPath, target);
  await pruneBackups(dir);
  await useSettingsStore.getState().set(SETTINGS.lastBackupDate, todayKey());
  log.info("backup", `database backup written: ${target}`);
  return target;
}

/** Once per day on app start. */
export async function runDailyBackupIfNeeded(): Promise<void> {
  if (!isTauri()) return;
  try {
    if (getSetting<string | null>(SETTINGS.lastBackupDate, null) === todayKey()) return;
    await createBackup();
  } catch (e) {
    log.error("backup", "daily backup failed", e);
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  if (!isTauri()) return [];
  const { native, joinPath } = await import("@/platform/native");
  const dir = await joinPath(await getWorkingFolder(), "backups");
  const entries = await native.listDir(dir);
  return entries
    .filter((e) => !e.is_dir && e.name.startsWith(BACKUP_PREFIX) && e.name.endsWith(".db"))
    .map((e) => ({ name: e.name, path: e.path, size: e.size, modified_ms: e.modified_ms }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

async function pruneBackups(dir: string): Promise<void> {
  const { native } = await import("@/platform/native");
  const backups = (await native.listDir(dir)).filter((e) => !e.is_dir && e.name.startsWith(BACKUP_PREFIX) && e.name.endsWith(".db")).sort((a, b) => b.name.localeCompare(a.name));
  for (const old of backups.slice(BACKUP_KEEP)) {
    await native.removeFile(old.path);
    log.info("backup", `old backup removed: ${old.name}`);
  }
}
