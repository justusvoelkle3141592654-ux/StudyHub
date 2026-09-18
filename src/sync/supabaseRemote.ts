import type { SupabaseClient } from "@supabase/supabase-js";
import { NetworkError, type RemoteRow, type SyncRemote } from "./remote";

/** `SyncRemote` backed by Supabase (PostgREST + Storage). */
export class SupabaseRemote implements SyncRemote {
  private bucketsEnsured = new Set<string>();

  constructor(private readonly sb: SupabaseClient) {}

  async upsert(table: string, row: Record<string, unknown>): Promise<RemoteRow> {
    const { data, error } = await this.wrap(this.sb.from(table).upsert(row, { onConflict: "id" }).select("*").single());
    if (error) throw new Error(`${table}: ${error.message}`);
    return data as RemoteRow;
  }

  async get(table: string, id: string): Promise<RemoteRow | null> {
    const { data, error } = await this.wrap(this.sb.from(table).select("*").eq("id", id).maybeSingle());
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data as RemoteRow | null) ?? null;
  }

  async fetchSince(table: string, sinceSyncedAt: string | null, limit: number, offset: number): Promise<RemoteRow[]> {
    let q = this.sb.from(table).select("*").order("synced_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + limit - 1);
    if (sinceSyncedAt) q = q.gt("synced_at", sinceSyncedAt);
    const { data, error } = await this.wrap(q);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as RemoteRow[];
  }

  async uploadFile(userId: string, path: string, bytes: Uint8Array, mimeType: string | null): Promise<string> {
    await this.ensureBucket(userId);
    const { error } = await this.wrap(this.sb.storage.from(userId).upload(path, bytes, { contentType: mimeType ?? "application/octet-stream", upsert: true }));
    if (error) throw new Error(`upload: ${error.message}`);
    return path;
  }

  async downloadFile(userId: string, path: string): Promise<Uint8Array> {
    const { data, error } = await this.wrap(this.sb.storage.from(userId).download(path));
    if (error || !data) throw new Error(`download: ${error?.message ?? "no data"}`);
    return new Uint8Array(await data.arrayBuffer());
  }

  /** One private bucket per user, named after the user id (see supabase/schema.sql). */
  private async ensureBucket(userId: string): Promise<void> {
    if (this.bucketsEnsured.has(userId)) return;
    const { error } = await this.wrap(this.sb.storage.createBucket(userId, { public: false }));
    // "already exists" is fine; anything else is reported.
    if (error && !/exist/i.test(error.message)) throw new Error(`bucket: ${error.message}`);
    this.bucketsEnsured.add(userId);
  }

  /** Translate transport failures into NetworkError so the engine backs off instead of counting attempts. */
  private async wrap<T>(p: PromiseLike<T>): Promise<T> {
    try {
      const res = await p;
      const err = (res as { error?: { message?: string } | null }).error;
      if (err && /fetch|network|ENOTFOUND|ECONNREFUSED|timeout/i.test(err.message ?? "")) throw new NetworkError(err.message ?? "network");
      return res;
    } catch (e) {
      if (e instanceof NetworkError) throw e;
      if (e instanceof TypeError) throw new NetworkError(e.message);
      throw e;
    }
  }
}
