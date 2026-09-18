import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { FileEntry, NewEntity } from "../types";

export class FileRepository extends BaseRepository<FileEntry, "mime_type" | "size_bytes" | "local_path" | "remote_path" | "subject_id" | "folder_id" | "checksum_sha256" | "is_linked" | "upload_status"> {
  constructor(db: DbAdapter) {
    super(db, "files", [
      "name",
      "mime_type",
      "size_bytes",
      "local_path",
      "remote_path",
      "subject_id",
      "folder_id",
      "checksum_sha256",
      "is_linked",
      "upload_status",
    ]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "name COLLATE NOCASE ASC" });
  }

  getByFolder(folderId: string | null) {
    return folderId
      ? this.query("folder_id = ?", [folderId], { orderBy: "name COLLATE NOCASE ASC" })
      : this.query("folder_id IS NULL", [], { orderBy: "name COLLATE NOCASE ASC" });
  }

  search(term: string, subjectId?: string | null) {
    const like = `%${term}%`;
    return subjectId
      ? this.query("name LIKE ? AND subject_id = ?", [like, subjectId], { orderBy: "name COLLATE NOCASE ASC" })
      : this.query("name LIKE ?", [like], { orderBy: "name COLLATE NOCASE ASC" });
  }

  getPendingUploads() {
    return this.query("upload_status = 'pending'", []);
  }

  protected override applyDefaults(data: Parameters<FileRepository["insert"]>[0]): NewEntity<FileEntry> {
    return {
      mime_type: null,
      size_bytes: 0,
      local_path: null,
      remote_path: null,
      subject_id: null,
      folder_id: null,
      checksum_sha256: null,
      is_linked: 0,
      upload_status: "none",
      ...data,
    };
  }
}
