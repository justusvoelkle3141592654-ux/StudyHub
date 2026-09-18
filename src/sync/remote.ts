import type { SyncFields } from "@/data/types";

/** A row as stored on the server: sync fields + content, plus the server revision. */
export type RemoteRow = Omit<SyncFields, "sync_status" | "remote_rev"> & { rev: number; synced_at: string } & Record<string, unknown>;

/**
 * The subset of the cloud backend the sync engine needs. `SupabaseRemote`
 * implements it; tests use an in-memory fake.
 */
export interface SyncRemote {
  /** Insert or update a row; returns the stored row including its new `rev`. */
  upsert(table: string, row: Record<string, unknown>): Promise<RemoteRow>;
  /** Fetch one row by id (null when it does not exist). */
  get(table: string, id: string): Promise<RemoteRow | null>;
  /** Rows written on the server after `sinceSyncedAt` (exclusive), ordered by `synced_at`. */
  fetchSince(table: string, sinceSyncedAt: string | null, limit: number, offset: number): Promise<RemoteRow[]>;
  /** Upload file bytes; returns the remote path. */
  uploadFile(userId: string, path: string, bytes: Uint8Array, mimeType: string | null): Promise<string>;
  /** Download file bytes by remote path. */
  downloadFile(userId: string, path: string): Promise<Uint8Array>;
}

/** Error thrown for connectivity problems (retried with backoff). */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export function isNetworkError(e: unknown): boolean {
  if (e instanceof NetworkError) return true;
  if (e instanceof TypeError && /fetch|network|Failed to fetch|Load failed/i.test(e.message)) return true;
  return false;
}
