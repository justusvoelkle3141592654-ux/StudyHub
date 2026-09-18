import Database from "@tauri-apps/plugin-sql";
import { probeFts5, type DbAdapter, type DbCapabilities, type ExecuteResult, type SqlValue } from "./adapter";

/**
 * tauri-plugin-sql adapter (SQLite via sqlx on the Rust side).
 *
 * Note: the plugin hands out connections from a pool, so a transaction must
 * be issued inside one `execute` call. `executeBatch` therefore concatenates
 * the statements into a single `BEGIN … COMMIT` script; parameters are
 * inlined with proper SQL quoting because multi-statement scripts cannot be
 * bound.
 */
export class TauriSqlAdapter implements DbAdapter {
  readonly kind = "tauri" as const;
  readonly capabilities: DbCapabilities = { fts5: false };

  private constructor(private readonly db: Database) {}

  /**
   * @param absolutePath absolute path of the .db file. The plugin joins
   *   relative paths onto the app config directory, an absolute path replaces it.
   */
  static async open(absolutePath: string): Promise<TauriSqlAdapter> {
    const db = await Database.load(`sqlite:${absolutePath}`);
    const adapter = new TauriSqlAdapter(db);
    await adapter.execute("PRAGMA foreign_keys = ON");
    await adapter.execute("PRAGMA journal_mode = WAL");
    (adapter.capabilities as DbCapabilities).fts5 = await probeFts5(adapter);
    return adapter;
  }

  async execute(sql: string, params: SqlValue[] = []): Promise<ExecuteResult> {
    const res = await this.db.execute(sql, params as unknown[]);
    return { rowsAffected: res.rowsAffected };
  }

  async select<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.select<T[]>(sql, params as unknown[]);
  }

  async executeBatch(statements: Array<{ sql: string; params?: SqlValue[] }>): Promise<void> {
    const script = ["BEGIN;", ...statements.map((s) => inlineParams(s.sql, s.params ?? []) + ";"), "COMMIT;"].join("\n");
    try {
      await this.db.execute(script);
    } catch (e) {
      try {
        await this.db.execute("ROLLBACK");
      } catch {
        /* no open transaction */
      }
      throw e;
    }
  }

  async flush(): Promise<void> {
    // sqlx commits synchronously; WAL checkpoints are handled by SQLite.
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

/** Replace positional `?` placeholders with SQL literals (outside quotes). */
export function inlineParams(sql: string, params: SqlValue[]): string {
  let idx = 0;
  let out = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      inString = !inString;
      out += ch;
    } else if (ch === "?" && !inString) {
      if (idx >= params.length) throw new Error("Not enough parameters for SQL statement");
      out += toSqlLiteral(params[idx++]);
    } else {
      out += ch;
    }
  }
  if (idx !== params.length) throw new Error("Too many parameters for SQL statement");
  return out;
}

export function toSqlLiteral(v: SqlValue | undefined): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Uint8Array) {
    let hex = "";
    for (const b of v) hex += b.toString(16).padStart(2, "0");
    return `X'${hex}'`;
  }
  return `'${v.replace(/'/g, "''")}'`;
}
