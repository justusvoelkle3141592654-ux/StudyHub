import type { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import { probeFts5, type DbAdapter, type DbCapabilities, type ExecuteResult, type SqlValue } from "./adapter";

/**
 * sql.js adapter: SQLite compiled to WebAssembly, running in the page.
 * Used for browser development, Playwright and Vitest. Optionally persists
 * the database image into IndexedDB so browser sessions survive reloads.
 */
export class SqlJsAdapter implements DbAdapter {
  readonly kind = "sqljs" as const;
  readonly capabilities: DbCapabilities = { fts5: false };
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(
    private readonly db: SqlJsDatabase,
    private readonly persist: ((image: Uint8Array) => Promise<void>) | null,
  ) {}

  static async create(options: {
    initial?: Uint8Array | null;
    persist?: ((image: Uint8Array) => Promise<void>) | null;
  } = {}): Promise<SqlJsAdapter> {
    const SQL = await loadSqlJs();
    const db = options.initial ? new SQL.Database(options.initial) : new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
    const adapter = new SqlJsAdapter(db, options.persist ?? null);
    (adapter.capabilities as DbCapabilities).fts5 = await probeFts5(adapter);
    return adapter;
  }

  async execute(sql: string, params: SqlValue[] = []): Promise<ExecuteResult> {
    this.db.run(sql, normalizeParams(params));
    this.schedulePersist();
    return { rowsAffected: this.db.getRowsModified() };
  }

  async select<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(normalizeParams(params));
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async executeBatch(statements: Array<{ sql: string; params?: SqlValue[] }>): Promise<void> {
    this.db.run("BEGIN");
    try {
      for (const s of statements) this.db.run(s.sql, normalizeParams(s.params ?? []));
      this.db.run("COMMIT");
    } catch (e) {
      this.db.run("ROLLBACK");
      throw e;
    }
    this.schedulePersist();
  }

  /** Export the raw SQLite image (used for backups and persistence). */
  export(): Uint8Array {
    return this.db.export();
  }

  async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persist) await this.persist(this.db.export());
  }

  async close(): Promise<void> {
    await this.flush();
    this.db.close();
  }

  private schedulePersist() {
    if (!this.persist || this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist?.(this.db.export());
    }, 150);
  }
}

function normalizeParams(params: SqlValue[]): (string | number | null | Uint8Array)[] {
  return params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p === undefined ? null : p));
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const mod = await import("sql.js");
      const init = (mod.default ?? mod) as unknown as (cfg?: { locateFile?: (f: string) => string }) => Promise<SqlJsStatic>;
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        // Browser: let Vite serve the wasm binary.
        const wasmUrl = (await import("sql.js/dist/sql-wasm.wasm?url")).default;
        return init({ locateFile: () => wasmUrl });
      }
      // Node (Vitest): sql.js finds the wasm next to its own script.
      return init();
    })();
  }
  return sqlJsPromise;
}
