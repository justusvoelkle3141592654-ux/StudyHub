import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { Folder, FolderKind, NewEntity } from "../types";

export class FolderRepository extends BaseRepository<Folder, "parent_id"> {
  constructor(db: DbAdapter) {
    super(db, "folders", ["name", "parent_id", "kind"]);
  }

  getByKind(kind: FolderKind) {
    return this.query("kind = ?", [kind], { orderBy: "name COLLATE NOCASE ASC" });
  }

  protected override applyDefaults(data: Parameters<FolderRepository["insert"]>[0]): NewEntity<Folder> {
    return { parent_id: null, ...data };
  }
}
