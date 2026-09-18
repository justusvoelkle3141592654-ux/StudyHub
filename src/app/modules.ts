import type { UsageProfile } from "@/stores/appStore";

export type ModuleId =
  | "timetable"
  | "tasks"
  | "exams"
  | "subjects"
  | "notes"
  | "flashcards"
  | "grades"
  | "files"
  | "documents"
  | "tools";

export const ALL_MODULES: ModuleId[] = ["timetable", "tasks", "exams", "subjects", "notes", "flashcards", "grades", "files", "documents", "tools"];

/** Modules shown by default per usage profile (all remain available via settings). */
export const PROFILE_MODULES: Record<UsageProfile, ModuleId[]> = {
  school: ["timetable", "tasks", "exams", "subjects", "grades", "flashcards", "notes", "files", "tools"],
  university: ["timetable", "tasks", "exams", "subjects", "notes", "flashcards", "grades", "files", "documents", "tools"],
  work: ["tasks", "notes", "documents", "files", "tools", "subjects", "flashcards"],
  mixed: ALL_MODULES,
};

export type DashboardTile = "timetable" | "tasks" | "exams" | "flashcards" | "documents" | "notes";

export const PROFILE_TILES: Record<UsageProfile, DashboardTile[]> = {
  school: ["timetable", "tasks", "exams", "flashcards", "notes", "documents"],
  university: ["timetable", "tasks", "exams", "flashcards", "notes", "documents"],
  work: ["tasks", "notes", "documents", "flashcards", "timetable", "exams"],
  mixed: ["timetable", "tasks", "exams", "flashcards", "notes", "documents"],
};
