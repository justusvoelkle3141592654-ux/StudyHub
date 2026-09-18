import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { Document, NewEntity } from "../types";

export class DocumentRepository extends BaseRepository<Document, "content_json" | "folder_id"> {
  constructor(db: DbAdapter) {
    super(db, "documents", ["title", "doc_type", "content_json", "folder_id"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "updated_at DESC" });
  }

  getRecent(limit: number) {
    return this.query("", [], { orderBy: "updated_at DESC", limit });
  }

  protected override applyDefaults(data: Parameters<DocumentRepository["insert"]>[0]): NewEntity<Document> {
    return { content_json: "{}", folder_id: null, ...data };
  }
}
