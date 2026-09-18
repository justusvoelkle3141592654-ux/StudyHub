import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { Exam, NewEntity } from "../types";

export class ExamRepository extends BaseRepository<Exam, "subject_id" | "topics" | "weight" | "reminder_at"> {
  constructor(db: DbAdapter) {
    super(db, "exams", ["title", "subject_id", "date", "topics", "weight", "reminder_at"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "date ASC" });
  }

  getBetween(fromIso: string, toIso: string) {
    return this.query("date >= ? AND date <= ?", [fromIso, toIso], { orderBy: "date ASC" });
  }

  protected override applyDefaults(data: Parameters<ExamRepository["insert"]>[0]): NewEntity<Exam> {
    return { subject_id: null, topics: null, weight: 1, reminder_at: null, ...data };
  }
}
