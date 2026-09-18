import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { NewEntity, Task } from "../types";

export class TaskRepository extends BaseRepository<Task, "description" | "subject_id" | "due_at" | "priority" | "status" | "reminder_at" | "recurrence" | "completed_at"> {
  constructor(db: DbAdapter) {
    super(db, "tasks", ["title", "description", "subject_id", "due_at", "priority", "status", "reminder_at", "recurrence", "completed_at"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "status ASC, due_at IS NULL, due_at ASC, priority ASC" });
  }

  getOpen() {
    return this.query("status = 'open'", [], { orderBy: "due_at IS NULL, due_at ASC, priority ASC" });
  }

  /** Open tasks due before the given ISO timestamp (inclusive), plus overdue ones. */
  getDueUntil(untilIso: string) {
    return this.query("status = 'open' AND due_at IS NOT NULL AND due_at <= ?", [untilIso], { orderBy: "due_at ASC" });
  }

  getBySubject(subjectId: string) {
    return this.query("subject_id = ?", [subjectId], { orderBy: "due_at ASC" });
  }

  protected override applyDefaults(data: Parameters<TaskRepository["insert"]>[0]): NewEntity<Task> {
    return {
      description: null,
      subject_id: null,
      due_at: null,
      priority: 2,
      status: "open",
      reminder_at: null,
      recurrence: null,
      completed_at: null,
      ...data,
    };
  }
}
