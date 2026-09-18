import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { Grade, NewEntity } from "../types";

export class GradeRepository extends BaseRepository<Grade, "weight"> {
  constructor(db: DbAdapter) {
    super(db, "grades", ["subject_id", "title", "value", "scale", "weight", "date"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "date DESC" });
  }

  getBySubject(subjectId: string) {
    return this.query("subject_id = ?", [subjectId], { orderBy: "date ASC" });
  }

  protected override applyDefaults(data: Parameters<GradeRepository["insert"]>[0]): NewEntity<Grade> {
    return { weight: 1, ...data };
  }
}
