import type { DbAdapter } from "./adapter";

export interface Migration {
  version: number;
  name: string;
  sql: string;
  /** Optional engine capability declared with `-- @requires <cap>` in the file. */
  requires: Array<keyof DbAdapter["capabilities"]>;
}

/**
 * All migration files are bundled at build time. Files are named
 * `NNNN_description.sql`; the numeric prefix is the version.
 */
const files = import.meta.glob("../../../migrations/*.sql", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

export function loadBundledMigrations(): Migration[] {
  return Object.entries(files)
    .map(([path, sql]) => parseMigration(path.split("/").pop() ?? path, sql))
    .sort((a, b) => a.version - b.version);
}

export function parseMigration(fileName: string, sql: string): Migration {
  const m = /^(\d+)_(.+)\.sql$/.exec(fileName);
  if (!m) throw new Error(`Invalid migration file name: ${fileName}`);
  const requires = [...sql.matchAll(/^--\s*@requires\s+(\w+)/gm)].map((x) => x[1] as keyof DbAdapter["capabilities"]);
  return { version: Number(m[1]), name: m[2], sql, requires };
}

/**
 * Split an SQL script into statements. Semicolons inside string literals,
 * line comments and trigger bodies (`CREATE TRIGGER … BEGIN … END;`) are not
 * statement terminators. Trigger bodies must not contain a bare `END;`
 * other than the closing one (no CASE … END; inside triggers).
 */
export function splitStatements(script: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inString = false;
  let i = 0;
  while (i < script.length) {
    const ch = script[i];
    if (!inString && ch === "-" && script[i + 1] === "-") {
      while (i < script.length && script[i] !== "\n") i++;
      continue;
    }
    if (ch === "'") inString = !inString;
    buf += ch;
    if (ch === ";" && !inString) {
      const isTrigger = /CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i.test(buf);
      if (!isTrigger || /\bEND\s*;$/i.test(buf.trim())) {
        const stmt = buf.trim().replace(/;$/, "");
        if (stmt) out.push(stmt);
        buf = "";
      }
    }
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export interface MigrationResult {
  applied: number[];
  skipped: number[];
  currentVersion: number;
}

/**
 * Apply all pending migrations in order. The `schema_migrations` table
 * records what has run. Callers are responsible for backing up the database
 * file before invoking this (see bootstrap).
 */
export async function runMigrations(db: DbAdapter, migrations: Migration[] = loadBundledMigrations()): Promise<MigrationResult> {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL, skipped INTEGER NOT NULL DEFAULT 0)",
  );
  const rows = await db.select<{ version: number }>("SELECT version FROM schema_migrations");
  const done = new Set(rows.map((r) => Number(r.version)));
  const result: MigrationResult = { applied: [], skipped: [], currentVersion: Math.max(0, ...done) };

  for (const m of migrations) {
    if (done.has(m.version)) continue;
    const unsupported = m.requires.some((cap) => !db.capabilities[cap]);
    if (unsupported) {
      await db.execute("INSERT INTO schema_migrations (version, name, applied_at, skipped) VALUES (?, ?, ?, 1)", [
        m.version,
        m.name,
        new Date().toISOString(),
      ]);
      result.skipped.push(m.version);
      continue;
    }
    const statements = splitStatements(m.sql).map((sql) => ({ sql }));
    statements.push({
      sql: `INSERT INTO schema_migrations (version, name, applied_at, skipped) VALUES (${m.version}, '${m.name.replace(/'/g, "''")}', '${new Date().toISOString()}', 0)`,
    });
    try {
      await db.executeBatch(statements);
    } catch (e) {
      throw new MigrationError(m.version, m.name, e);
    }
    result.applied.push(m.version);
    result.currentVersion = m.version;
  }
  return result;
}

export class MigrationError extends Error {
  constructor(
    public readonly version: number,
    public readonly name: string,
    public readonly cause: unknown,
  ) {
    super(`Migration ${version}_${name} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "MigrationError";
  }
}
