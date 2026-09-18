import type { DbAdapter } from "../db/adapter";
import { nowIso } from "../repository";
import type { SyncQueueEntry } from "../types";

/** Outbox access for the sync engine. Rows here are physically deleted after a successful push. */
export class SyncQueueRepository {
  constructor(private readonly db: DbAdapter) {}

  /** Entries ready to be sent now, oldest first. */
  getReady(now: string = nowIso(), limit = 100): Promise<SyncQueueEntry[]> {
    return this.db.select<SyncQueueEntry>(
      "SELECT * FROM sync_queue WHERE is_failed = 0 AND (next_attempt_at IS NULL OR next_attempt_at <= ?) ORDER BY created_at ASC LIMIT ?",
      [now, limit],
    );
  }

  getAll(): Promise<SyncQueueEntry[]> {
    return this.db.select<SyncQueueEntry>("SELECT * FROM sync_queue ORDER BY created_at ASC");
  }

  getFailed(): Promise<SyncQueueEntry[]> {
    return this.db.select<SyncQueueEntry>("SELECT * FROM sync_queue WHERE is_failed = 1 ORDER BY created_at ASC");
  }

  async count(): Promise<number> {
    const rows = await this.db.select<{ n: number }>("SELECT COUNT(*) AS n FROM sync_queue WHERE is_failed = 0");
    return Number(rows[0]?.n ?? 0);
  }

  async remove(id: string): Promise<void> {
    await this.db.execute("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  async markAttemptFailed(id: string, error: string, nextAttemptAt: string | null, markFailed: boolean): Promise<void> {
    await this.db.execute(
      "UPDATE sync_queue SET attempts = attempts + 1, last_error = ?, next_attempt_at = ?, is_failed = ? WHERE id = ?",
      [error.slice(0, 2000), nextAttemptAt, markFailed ? 1 : 0, id],
    );
  }

  /** Put a failed entry back into rotation. */
  async retry(id: string): Promise<void> {
    await this.db.execute("UPDATE sync_queue SET is_failed = 0, attempts = 0, next_attempt_at = NULL, last_error = NULL WHERE id = ?", [id]);
  }

  async clearFailed(): Promise<void> {
    await this.db.execute("DELETE FROM sync_queue WHERE is_failed = 1");
  }
}
