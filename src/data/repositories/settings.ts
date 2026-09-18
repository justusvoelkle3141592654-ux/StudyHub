import type { DbAdapter } from "../db/adapter";
import { nowIso } from "../repository";

/**
 * Key/value settings stored in the local database. Values are JSON encoded.
 * These are device-local and never synchronised.
 */
export class SettingsRepository {
  constructor(private readonly db: DbAdapter) {}

  async get<T>(key: string): Promise<T | null> {
    const rows = await this.db.select<{ value_json: string }>("SELECT value_json FROM settings WHERE key = ?", [key]);
    if (!rows[0]) return null;
    try {
      return JSON.parse(rows[0].value_json) as T;
    } catch {
      return null;
    }
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select<{ key: string; value_json: string }>("SELECT key, value_json FROM settings");
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value_json);
      } catch {
        /* ignore malformed */
      }
    }
    return out;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.db.execute(
      "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
      [key, JSON.stringify(value ?? null), nowIso()],
    );
  }

  async setMany(values: Record<string, unknown>): Promise<void> {
    const ts = nowIso();
    await this.db.executeBatch(
      Object.entries(values).map(([key, value]) => ({
        sql: "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
        params: [key, JSON.stringify(value ?? null), ts],
      })),
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.execute("DELETE FROM settings WHERE key = ?", [key]);
  }
}
