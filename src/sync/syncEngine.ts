import type { Repositories } from "@/data/repositories";
import type { BaseRepository } from "@/data/repository";
import { newId, nowIso } from "@/data/repository";
import type { FileEntry, SyncFields, SyncQueueEntry } from "@/data/types";
import { SETTINGS } from "@/app/settingsKeys";
import { backoffMs, MAX_ATTEMPTS, resolveConflict } from "./conflicts";
import { isNetworkError, type RemoteRow, type SyncRemote } from "./remote";

export interface SyncEngineOptions {
  repos: Repositories;
  remote: SyncRemote;
  userId: string;
  /** Called after a conflict was resolved so the UI can notify the user. */
  onConflict?: (table: string, winner: "local" | "remote", copyTitle: string | null) => void;
  /** Progress of file uploads. */
  onUploadProgress?: (done: number, total: number) => void;
  /** Read local bytes of a file for upload. */
  readFileBytes?: (file: FileEntry) => Promise<Uint8Array | null>;
  /** Localised conflict suffix. */
  conflictSuffix?: (date: string) => string;
  now?: () => Date;
  log?: (level: "info" | "warn" | "error", message: string, detail?: unknown) => void;
}

export interface SyncRunResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  failed: number;
  uploaded: number;
  /** True when the run stopped because the network was unreachable. */
  offline: boolean;
}

const PULL_PAGE = 500;
const SYNC_ONLY_COLUMNS = new Set(["sync_status", "remote_rev"]);

/** Repositories are used generically here; the concrete row types do not matter to the engine. */
type AnyRepo = BaseRepository<SyncFields>;
function syncedRepos(repos: Repositories): Array<[string, AnyRepo]> {
  return Object.entries(repos.syncedTables) as unknown as Array<[string, AnyRepo]>;
}

/**
 * Local-first synchronisation (see docs/DATENMODELL.md §5):
 *  1. push the outbox (`sync_queue`) in order,
 *  2. pull rows changed since `settings.sync.lastSyncAt`,
 *  3. upload pending files to storage.
 * Conflicts are resolved last-write-wins with a preserved copy of the loser.
 */
export class SyncEngine {
  private running = false;

  constructor(private readonly o: SyncEngineOptions) {}

  get isRunning() {
    return this.running;
  }

  async run(): Promise<SyncRunResult> {
    if (this.running) return { pushed: 0, pulled: 0, conflicts: 0, failed: 0, uploaded: 0, offline: false };
    this.running = true;
    const result: SyncRunResult = { pushed: 0, pulled: 0, conflicts: 0, failed: 0, uploaded: 0, offline: false };
    try {
      await this.push(result);
      if (result.offline) return result;
      await this.pull(result);
      if (result.offline) return result;
      // Conflict copies created during the pull are new local rows: push them right away.
      if (result.conflicts > 0) await this.push(result);
      if (result.offline) return result;
      await this.uploadFiles(result);
    } finally {
      this.running = false;
    }
    return result;
  }

  // ---------------------------------------------------------------- push

  private async push(result: SyncRunResult): Promise<void> {
    const { repos, remote } = this.o;
    const now = this.o.now?.() ?? new Date();
    const entries = await repos.syncQueue.getReady(now.toISOString());
    for (const entry of entries) {
      const repo = this.repoFor(entry.entity_table);
      if (!repo) {
        await repos.syncQueue.remove(entry.id);
        continue;
      }
      try {
        const local = await repo.getById(entry.entity_id, true);
        if (!local) {
          await repos.syncQueue.remove(entry.id);
          continue;
        }
        // Detect a concurrent remote change: the server revision moved past what we last saw.
        const serverRow = await remote.get(entry.entity_table, entry.entity_id);
        if (serverRow && local.remote_rev !== null && serverRow.rev !== local.remote_rev) {
          const handled = await this.handleConflict(entry.entity_table, repo, local, serverRow, result);
          if (handled === "remote") {
            await repos.syncQueue.remove(entry.id);
            continue;
          }
        } else if (serverRow && local.remote_rev === null && Date.parse(serverRow.updated_at) > Date.parse(local.updated_at)) {
          // Row created on both sides with the same id (should not happen with UUIDs) – treat as conflict.
          const handled = await this.handleConflict(entry.entity_table, repo, local, serverRow, result);
          if (handled === "remote") {
            await repos.syncQueue.remove(entry.id);
            continue;
          }
        }
        const stored = await remote.upsert(entry.entity_table, this.toRemotePayload(local));
        await repo.markSynced(local.id, stored.rev);
        await repos.syncQueue.remove(entry.id);
        result.pushed++;
      } catch (e) {
        if (isNetworkError(e)) {
          result.offline = true;
          this.o.log?.("warn", "push stopped: offline", e);
          return;
        }
        const attempts = entry.attempts + 1;
        const failed = attempts >= MAX_ATTEMPTS;
        const next = new Date((this.o.now?.() ?? new Date()).getTime() + backoffMs(attempts)).toISOString();
        await repos.syncQueue.markAttemptFailed(entry.id, e instanceof Error ? e.message : String(e), failed ? null : next, failed);
        if (failed) result.failed++;
        this.o.log?.("error", `push of ${entry.entity_table}/${entry.entity_id} failed (attempt ${attempts})`, e);
      }
    }
  }

  // ---------------------------------------------------------------- pull

  private async pull(result: SyncRunResult): Promise<void> {
    const { repos, remote } = this.o;
    for (const [table, repo] of syncedRepos(repos)) {
      // One cursor per table (server time of the last row seen) so tables never shadow each other.
      const cursorKey = `${SETTINGS.syncCursorPrefix}${table}`;
      const since = (await repos.settings.get<string>(cursorKey)) ?? null;
      let newest = since;
      let offset = 0;
      for (;;) {
        let rows: RemoteRow[];
        try {
          rows = await remote.fetchSince(table, since, PULL_PAGE, offset);
        } catch (e) {
          if (isNetworkError(e)) {
            result.offline = true;
            this.o.log?.("warn", "pull stopped: offline", e);
            return;
          }
          throw e;
        }
        for (const row of rows) {
          const local = await repo.getById(row.id, true);
          if (local && local.sync_status === "pending") {
            // Pending local edits: only a conflict when the server moved on since we last saw it.
            if (local.remote_rev !== row.rev) {
              const winner = await this.handleConflict(table, repo, local, row, result);
              // The local winner supersedes the server version; remember its rev so the push does not re-detect the conflict.
              if (winner === "local") await repo.setRemoteRev(local.id, row.rev);
            }
          } else if (!local || local.remote_rev !== row.rev) {
            await repo.upsertFromRemote(this.fromRemoteRow(row) as unknown as SyncFields);
            result.pulled++;
          }
          if (!newest || row.synced_at > newest) newest = row.synced_at;
        }
        if (rows.length < PULL_PAGE) break;
        offset += rows.length;
      }
      if (newest && newest !== since) await repos.settings.set(cursorKey, newest);
    }
    await repos.settings.set(SETTINGS.lastSyncAt, (this.o.now?.() ?? new Date()).toISOString());
  }

  // ---------------------------------------------------------------- files

  private async uploadFiles(result: SyncRunResult): Promise<void> {
    const { repos, remote, readFileBytes, userId } = this.o;
    if (!readFileBytes) return;
    const pending = await repos.files.getPendingUploads();
    const total = pending.length;
    let done = 0;
    this.o.onUploadProgress?.(done, total);
    for (const file of pending) {
      try {
        const bytes = await readFileBytes(file);
        if (!bytes) {
          await repos.files.update(file.id, { upload_status: "failed" });
          continue;
        }
        const remotePath = await remote.uploadFile(userId, `files/${file.id}/${file.name}`, bytes, file.mime_type);
        await repos.files.update(file.id, { remote_path: remotePath, upload_status: "uploaded" });
        result.uploaded++;
      } catch (e) {
        if (isNetworkError(e)) {
          result.offline = true;
          return;
        }
        await repos.files.update(file.id, { upload_status: "failed" });
        this.o.log?.("error", `upload of ${file.name} failed`, e);
      } finally {
        done++;
        this.o.onUploadProgress?.(done, total);
      }
    }
    // Push the metadata changes made above right away so other devices see remote_path.
    if (result.uploaded > 0) await this.push(result);
  }

  // ---------------------------------------------------------------- helpers

  /** Returns the winner. Applies the winning version locally/remotely and stores the loser copy. */
  private async handleConflict(table: string, repo: AnyRepo, local: SyncFields, remoteRow: RemoteRow, result: SyncRunResult): Promise<"local" | "remote"> {
    const { winner, loserCopy } = resolveConflict(table, local as SyncFields & Record<string, unknown>, remoteRow, newId(), this.o.now?.() ?? new Date(), this.o.conflictSuffix);
    result.conflicts++;
    if (winner === "remote") {
      await repo.upsertFromRemote(this.fromRemoteRow(remoteRow) as unknown as SyncFields);
    }
    if (loserCopy) {
      // The copy is a brand-new local row; the repository enqueues it for the next push.
      const { id, created_at: _c, updated_at: _u, deleted_at: _d, user_id: _uid, ...content } = loserCopy as SyncFields & Record<string, unknown>;
      await repo.insert(content as never, id);
    }
    const titleKey = Object.keys(loserCopy ?? {}).find((k) => ["title", "name", "front"].includes(k));
    this.o.onConflict?.(table, winner, loserCopy && titleKey ? String(loserCopy[titleKey]) : null);
    return winner;
  }

  private repoFor(table: string): AnyRepo | null {
    return (this.o.repos.syncedTables as unknown as Record<string, AnyRepo>)[table] ?? null;
  }

  private toRemotePayload(local: SyncFields): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(local)) {
      if (SYNC_ONLY_COLUMNS.has(k)) continue;
      out[k] = v;
    }
    out.user_id = this.o.userId;
    return out;
  }

  private fromRemoteRow(row: RemoteRow): Record<string, unknown> {
    const { rev, synced_at: _syncedAt, ...rest } = row;
    return { ...rest, sync_status: "synced", remote_rev: rev };
  }
}

/** Re-queue every row of every synced table (used when cloud mode is switched on). */
export async function enqueueAllRows(repos: Repositories, userId: string): Promise<number> {
  let count = 0;
  for (const [table, repo] of syncedRepos(repos)) {
    const rows = await repo.getAll({ includeDeleted: true });
    for (const row of rows) {
      const payload = { ...row, user_id: userId, sync_status: "pending" };
      await repos.db.executeBatch([
        { sql: `UPDATE ${table} SET user_id = ?, sync_status = 'pending' WHERE id = ?`, params: [userId, row.id] },
        { sql: "DELETE FROM sync_queue WHERE entity_table = ? AND entity_id = ?", params: [table, row.id] },
        {
          sql: "INSERT INTO sync_queue (id, entity_table, entity_id, operation, payload_json, attempts, last_error, next_attempt_at, is_failed, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, 0, ?)",
          params: [newId(), table, row.id, row.deleted_at ? "delete" : "upsert", JSON.stringify(payload), nowIso()],
        },
      ]);
      count++;
    }
  }
  return count;
}

/** Mark everything as local again (cloud mode switched off). */
export async function detachFromCloud(repos: Repositories): Promise<void> {
  for (const table of Object.keys(repos.syncedTables)) {
    await repos.db.execute(`UPDATE ${table} SET sync_status = 'local'`);
  }
  await repos.db.execute("DELETE FROM sync_queue");
  await repos.settings.remove(SETTINGS.lastSyncAt);
  for (const table of Object.keys(repos.syncedTables)) await repos.settings.remove(`${SETTINGS.syncCursorPrefix}${table}`);
}

export type { SyncQueueEntry };
