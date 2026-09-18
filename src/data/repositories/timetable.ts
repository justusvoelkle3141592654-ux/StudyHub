import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { NewEntity, TimetableSlot } from "../types";

export class TimetableRepository extends BaseRepository<TimetableSlot, "subject_id" | "room" | "week_type"> {
  constructor(db: DbAdapter) {
    super(db, "timetable_slots", ["subject_id", "weekday", "start_time", "end_time", "room", "week_type"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "weekday ASC, start_time ASC" });
  }

  getByWeekday(weekday: number) {
    return this.query("weekday = ?", [weekday], { orderBy: "start_time ASC" });
  }

  protected override applyDefaults(data: Parameters<TimetableRepository["insert"]>[0]): NewEntity<TimetableSlot> {
    return { subject_id: null, room: null, week_type: "all", ...data };
  }
}
