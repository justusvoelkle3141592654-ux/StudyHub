/**
 * Minimal database interface shared by the Tauri (tauri-plugin-sql) and the
 * in-browser (sql.js) implementations. All repositories talk to this
 * interface only.
 */

export type SqlValue = string | number | boolean | null | Uint8Array;

export interface ExecuteResult {
  rowsAffected: number;
}

export interface DbCapabilities {
  /** True when the underlying SQLite build has the FTS5 extension. */
  fts5: boolean;
}

export interface DbAdapter {
  readonly kind: "tauri" | "sqljs";
  readonly capabilities: DbCapabilities;
  execute(sql: string, params?: SqlValue[]): Promise<ExecuteResult>;
  select<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Run several statements in order inside a single transaction. */
  executeBatch(statements: Array<{ sql: string; params?: SqlValue[] }>): Promise<void>;
  /** Make sure pending writes reached durable storage (no-op for native SQLite). */
  flush(): Promise<void>;
  close(): Promise<void>;
}

/** Probe FTS5 support by creating and dropping a temporary virtual table. */
export async function probeFts5(db: Pick<DbAdapter, "execute">): Promise<boolean> {
  try {
    await db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS __fts5_probe USING fts5(x)");
    await db.execute("DROP TABLE IF EXISTS __fts5_probe");
    return true;
  } catch {
    return false;
  }
}
