import { BaseRepository, newId } from "../repository";
import type { DbAdapter } from "../db/adapter";
import { dataEvents } from "../events";
import type { NewEntity, Note, NoteFile, NoteTag } from "../types";

export class NoteRepository extends BaseRepository<Note, "content_markdown" | "subject_id" | "folder_id" | "is_pinned"> {
  constructor(db: DbAdapter) {
    super(db, "notes", ["title", "content_markdown", "subject_id", "folder_id", "is_pinned"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "is_pinned DESC, updated_at DESC" });
  }

  getByFolder(folderId: string | null) {
    return folderId
      ? this.query("folder_id = ?", [folderId], { orderBy: "is_pinned DESC, updated_at DESC" })
      : this.query("folder_id IS NULL", [], { orderBy: "is_pinned DESC, updated_at DESC" });
  }

  getRecent(limit: number) {
    return this.query("", [], { orderBy: "updated_at DESC", limit });
  }

  /**
   * Full-text search. Uses FTS5 when available (Tauri builds); falls back to
   * a LIKE scan in the in-browser development database.
   */
  async search(term: string, limit = 50): Promise<Note[]> {
    const q = term.trim();
    if (!q) return [];
    if (this.db.capabilities.fts5) {
      const match = toFtsQuery(q);
      return this.db.select<Note>(
        `SELECT n.* FROM notes_fts f JOIN notes n ON n.rowid = f.rowid
         WHERE notes_fts MATCH ? AND n.deleted_at IS NULL
         ORDER BY bm25(notes_fts) LIMIT ?`,
        [match, limit],
      );
    }
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    return this.query("title LIKE ? ESCAPE '\\' OR content_markdown LIKE ? ESCAPE '\\'", [like, like], {
      orderBy: "updated_at DESC",
      limit,
    });
  }

  protected override applyDefaults(data: Parameters<NoteRepository["insert"]>[0]): NewEntity<Note> {
    return { content_markdown: "", subject_id: null, folder_id: null, is_pinned: 0, ...data };
  }
}

/** Build a safe FTS5 MATCH expression: each word becomes a quoted prefix term. */
export function toFtsQuery(term: string): string {
  return term
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '""')}"*`)
    .join(" ");
}

export class NoteTagRepository extends BaseRepository<NoteTag> {
  constructor(db: DbAdapter) {
    super(db, "note_tags", ["note_id", "tag"]);
  }

  getForNote(noteId: string) {
    return this.query("note_id = ?", [noteId], { orderBy: "tag COLLATE NOCASE ASC" });
  }

  async getAllTags(): Promise<string[]> {
    const rows = await this.db.select<{ tag: string }>(
      "SELECT DISTINCT tag FROM note_tags WHERE deleted_at IS NULL ORDER BY tag COLLATE NOCASE ASC",
    );
    return rows.map((r) => r.tag);
  }

  getNoteIdsWithTag(tag: string) {
    return this.db
      .select<{ note_id: string }>("SELECT note_id FROM note_tags WHERE deleted_at IS NULL AND tag = ?", [tag])
      .then((rows) => rows.map((r) => r.note_id));
  }

  /** Replace the tag set of a note (soft-deletes removed tags, adds new ones). */
  async setTags(noteId: string, tags: string[]): Promise<void> {
    const wanted = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    const existing = await this.query("note_id = ?", [noteId]);
    const existingTags = new Set(existing.map((e) => e.tag));
    for (const e of existing) if (!wanted.includes(e.tag)) await this.softDelete(e.id);
    for (const t of wanted) {
      if (!existingTags.has(t)) {
        // Reuse a soft-deleted row for the same tag if present, otherwise insert.
        const deleted = await this.db.select<NoteTag>(
          "SELECT * FROM note_tags WHERE note_id = ? AND tag = ? AND deleted_at IS NOT NULL LIMIT 1",
          [noteId, t],
        );
        if (deleted[0]) await this.restore(deleted[0].id);
        else await this.insert({ note_id: noteId, tag: t }, newId());
      }
    }
    dataEvents.emit("note_tags", [noteId]);
  }
}

export class NoteFileRepository extends BaseRepository<NoteFile> {
  constructor(db: DbAdapter) {
    super(db, "note_files", ["note_id", "file_id"]);
  }

  getForNote(noteId: string) {
    return this.query("note_id = ?", [noteId]);
  }

  getForFile(fileId: string) {
    return this.query("file_id = ?", [fileId]);
  }

  async link(noteId: string, fileId: string): Promise<void> {
    const existing = await this.db.select<NoteFile>("SELECT * FROM note_files WHERE note_id = ? AND file_id = ? LIMIT 1", [noteId, fileId]);
    if (existing[0]) {
      if (existing[0].deleted_at) await this.restore(existing[0].id);
      return;
    }
    await this.insert({ note_id: noteId, file_id: fileId });
  }

  async unlink(noteId: string, fileId: string): Promise<void> {
    const existing = await this.query("note_id = ? AND file_id = ?", [noteId, fileId]);
    for (const e of existing) await this.softDelete(e.id);
  }
}
