import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { NewEntity, Subject } from "../types";

export class SubjectRepository extends BaseRepository<Subject, "teacher" | "room" | "sort_order"> {
  constructor(db: DbAdapter) {
    super(db, "subjects", ["name", "color", "teacher", "room", "sort_order"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "sort_order ASC, name COLLATE NOCASE ASC" });
  }

  protected override applyDefaults(data: Parameters<SubjectRepository["insert"]>[0]): NewEntity<Subject> {
    return { teacher: null, room: null, sort_order: 0, ...data };
  }
}
