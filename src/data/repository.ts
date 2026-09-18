import { v4 as uuidv4 } from "uuid";
import type { DbAdapter, SqlValue } from "./db/adapter";
import { dataContext } from "./context";
import { dataEvents } from "./events";
import type { EntityPatch, NewEntity, SyncFields } from "./types";

export const SYNC_COLUMNS: (keyof SyncFields)[] = [
  "id",
  "user_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "sync_status",
  "remote_rev",
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return uuidv4();
}

export interface QueryOptions {
  /** Include soft-deleted rows. Default: false. */
  includeDeleted?: boolean;
  orderBy?: string;
  limit?: number;
}

/**
 * Base repository implementing the write rules from brief section 3.5:
 *  - every write sets `updated_at` (UTC ISO-8601),
 *  - every write sets `sync_status = 'pending'` (or `local` in offline mode),
 *  - every write enqueues a `sync_queue` entry when cloud mode is active,
 *  - deletes are soft deletes (`deleted_at`), never `DELETE FROM`.
 */
/** Make keys K of T optional. */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * @typeParam T entity row type
 * @typeParam O keys of the row that callers may omit on insert (filled by `applyDefaults`)
 */
export abstract class BaseRepository<T extends SyncFields, O extends keyof NewEntity<T> = never> {
  constructor(
    protected readonly db: DbAdapter,
    readonly table: string,
    /** Content columns (without the sync fields). */
    readonly columns: ReadonlyArray<Exclude<keyof T, keyof SyncFields> & string>,
  ) {}

  protected get allColumns(): string[] {
    return [...SYNC_COLUMNS, ...this.columns];
  }

  async getById(id: string, includeDeleted = false): Promise<T | null> {
    const rows = await this.db.select<T>(
      `SELECT * FROM ${this.table} WHERE id = ?${includeDeleted ? "" : " AND deleted_at IS NULL"}`,
      [id],
    );
    return rows[0] ?? null;
  }

  async getAll(options: QueryOptions = {}): Promise<T[]> {
    return this.query("", [], options);
  }

  /** Query with an extra WHERE fragment (without the leading AND). */
  protected async query(where: string, params: SqlValue[], options: QueryOptions = {}): Promise<T[]> {
    const clauses: string[] = [];
    if (!options.includeDeleted) clauses.push("deleted_at IS NULL");
    if (where) clauses.push(`(${where})`);
    const sql =
      `SELECT * FROM ${this.table}` +
      (clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "") +
      (options.orderBy ? ` ORDER BY ${options.orderBy}` : "") +
      (options.limit ? ` LIMIT ${Number(options.limit)}` : "");
    return this.db.select<T>(sql, params);
  }

  async count(where = "", params: SqlValue[] = []): Promise<number> {
    const sql = `SELECT COUNT(*) AS n FROM ${this.table} WHERE deleted_at IS NULL${where ? ` AND (${where})` : ""}`;
    const rows = await this.db.select<{ n: number }>(sql, params);
    return Number(rows[0]?.n ?? 0);
  }

  async insert(data: Optional<NewEntity<T>, O>, id: string = newId()): Promise<T> {
    const ts = nowIso();
    const row = {
      id,
      user_id: dataContext.userId,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
      sync_status: dataContext.cloudEnabled ? "pending" : "local",
      remote_rev: null,
      ...this.applyDefaults(data),
    } as T;
    const cols = this.allColumns;
    const statements = [
      {
        sql: `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        params: cols.map((c) => toSql((row as Record<string, unknown>)[c])),
      },
      ...this.queueStatements(row, "upsert"),
    ];
    await this.db.executeBatch(statements);
    dataEvents.emit(this.table, [id]);
    return row;
  }

  async update(id: string, patch: EntityPatch<T>): Promise<T> {
    const existing = await this.getById(id, true);
    if (!existing) throw new Error(`${this.table}: row ${id} not found`);
    const next = { ...existing, ...patch, updated_at: nowIso(), sync_status: dataContext.cloudEnabled ? "pending" : "local" } as T;
    await this.writeRow(next, "upsert");
    dataEvents.emit(this.table, [id]);
    return next;
  }

  /** Soft delete: sets `deleted_at`, keeps the row for synchronisation. */
  async softDelete(id: string): Promise<void> {
    const existing = await this.getById(id, true);
    if (!existing || existing.deleted_at) return;
    const ts = nowIso();
    const next = { ...existing, deleted_at: ts, updated_at: ts, sync_status: dataContext.cloudEnabled ? "pending" : "local" } as T;
    await this.writeRow(next, "delete");
    dataEvents.emit(this.table, [id]);
  }

  async restore(id: string): Promise<void> {
    const existing = await this.getById(id, true);
    if (!existing || !existing.deleted_at) return;
    const next = { ...existing, deleted_at: null, updated_at: nowIso(), sync_status: dataContext.cloudEnabled ? "pending" : "local" } as T;
    await this.writeRow(next, "upsert");
    dataEvents.emit(this.table, [id]);
  }

  /**
   * Write a full row that came from the server (sync pull). Does not touch
   * `updated_at`, does not enqueue and marks the row as synced.
   */
  async upsertFromRemote(row: T): Promise<void> {
    const cols = this.allColumns;
    const synced = { ...row, sync_status: "synced" } as T;
    await this.db.execute(
      `INSERT OR REPLACE INTO ${this.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      cols.map((c) => toSql((synced as Record<string, unknown>)[c])),
    );
    dataEvents.emit(this.table, [row.id]);
  }

  /** Mark a row as synced after a successful push. */
  async markSynced(id: string, remoteRev: number | null): Promise<void> {
    await this.db.execute(`UPDATE ${this.table} SET sync_status = 'synced', remote_rev = ? WHERE id = ?`, [remoteRev, id]);
  }

  /** Update only the known server revision (after a resolved conflict where the local row wins). */
  async setRemoteRev(id: string, remoteRev: number | null): Promise<void> {
    await this.db.execute(`UPDATE ${this.table} SET remote_rev = ? WHERE id = ?`, [remoteRev, id]);
  }

  /** Rows changed locally (pending), used by the sync engine. */
  async getPending(): Promise<T[]> {
    return this.db.select<T>(`SELECT * FROM ${this.table} WHERE sync_status = 'pending'`);
  }

  /** Hook for subclasses to fill in defaults for the optional keys before insert. */
  protected applyDefaults(data: Optional<NewEntity<T>, O>): NewEntity<T> {
    return data as NewEntity<T>;
  }

  private async writeRow(row: T, operation: "upsert" | "delete"): Promise<void> {
    const cols = this.allColumns.filter((c) => c !== "id");
    const statements = [
      {
        sql: `UPDATE ${this.table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
        params: [...cols.map((c) => toSql((row as Record<string, unknown>)[c])), row.id],
      },
      ...this.queueStatements(row, operation),
    ];
    await this.db.executeBatch(statements);
  }

  private queueStatements(row: T, operation: "upsert" | "delete"): Array<{ sql: string; params: SqlValue[] }> {
    if (!dataContext.cloudEnabled) return [];
    return [
      // Collapse earlier queue entries for the same row: the latest full payload wins.
      { sql: "DELETE FROM sync_queue WHERE entity_table = ? AND entity_id = ? AND is_failed = 0", params: [this.table, row.id] },
      {
        sql: "INSERT INTO sync_queue (id, entity_table, entity_id, operation, payload_json, attempts, last_error, next_attempt_at, is_failed, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, 0, ?)",
        params: [newId(), this.table, row.id, operation, JSON.stringify(row), nowIso()],
      },
    ];
  }
}

function toSql(v: unknown): SqlValue {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" || typeof v === "number" || v instanceof Uint8Array) return v;
  return JSON.stringify(v);
}
