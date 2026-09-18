import type { GradeScale } from "@/data/types";
import type { Language, ThemeMode, Density, FontSize } from "@/stores/uiStore";
import type { StorageMode, UsageProfile } from "@/stores/appStore";
import type { ImportedCard, ImportedGrade, ImportedNote, ImportedTask } from "@/features/import/parsers";

export type ReviewIntensity = "relaxed" | "normal" | "intensive";

export interface DraftSubject {
  name: string;
  color: string;
}

export interface SetupDraft {
  language: Language;
  profile: UsageProfile;
  mode: StorageMode;
  /** Absolute path of the database file; null = default location. */
  dbPath: string | null;
  /** Absolute path of the working folder; null = not chosen (desktop default is applied on finish). */
  workingFolder: string | null;
  linkFilesInsteadOfCopy: boolean;
  subjects: DraftSubject[];
  timetableDays: 5 | 6;
  lessonsPerDay: number;
  /** Lesson start/end times, index = lesson number - 1. */
  lessonTimes: Array<{ start: string; end: string }>;
  abWeeks: boolean;
  gradeScale: GradeScale | "none";
  gradesWeighted: boolean;
  flashcardsDailyNew: number;
  flashcardsIntensity: ReviewIntensity;
  notificationsEnabled: boolean;
  notificationsLeadMinutes: number;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  aiEnabled: boolean;
  aiApiKey: string;
  theme: ThemeMode;
  fontSize: FontSize;
  density: Density;
  import: {
    grades: ImportedGrade[];
    tasks: ImportedTask[];
    cards: ImportedCard[];
    notes: ImportedNote[];
  };
}

export const SUBJECT_COLORS = [
  "#3b5bdb",
  "#e03131",
  "#2f9e44",
  "#f08c00",
  "#9c36b5",
  "#0c8599",
  "#e8590c",
  "#c2255c",
  "#5c940d",
  "#495057",
];

export const PROFILE_SUBJECT_SUGGESTIONS: Record<UsageProfile, string[]> = {
  school: ["Mathematik", "Deutsch", "Englisch", "Biologie", "Physik", "Chemie", "Geschichte", "Sport"],
  university: ["Analysis", "Lineare Algebra", "Programmierung", "Statistik", "Seminar"],
  work: ["Projekt A", "Projekt B", "Weiterbildung", "Verwaltung"],
  mixed: ["Mathematik", "Englisch", "Projekt A", "Weiterbildung"],
};

export function defaultLessonTimes(count: number): Array<{ start: string; end: string }> {
  // 45-minute lessons starting 08:00 with a short break, longer breaks after lesson 2 and 4.
  const out: Array<{ start: string; end: string }> = [];
  let minutes = 8 * 60;
  for (let i = 0; i < count; i++) {
    const start = minutes;
    const end = start + 45;
    out.push({ start: fmt(start), end: fmt(end) });
    minutes = end + (i === 1 || i === 3 ? 20 : 5);
  }
  return out;
}

function fmt(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function createDefaultDraft(language: Language = "de"): SetupDraft {
  return {
    language,
    profile: "mixed",
    mode: "local",
    dbPath: null,
    workingFolder: null,
    linkFilesInsteadOfCopy: false,
    subjects: [],
    timetableDays: 5,
    lessonsPerDay: 8,
    lessonTimes: defaultLessonTimes(8),
    abWeeks: false,
    gradeScale: "de_1_6",
    gradesWeighted: true,
    flashcardsDailyNew: 10,
    flashcardsIntensity: "normal",
    notificationsEnabled: false,
    notificationsLeadMinutes: 60,
    dailyReminderEnabled: false,
    dailyReminderTime: "18:00",
    aiEnabled: false,
    aiApiKey: "",
    theme: "system",
    fontSize: "normal",
    density: "comfortable",
    import: { grades: [], tasks: [], cards: [], notes: [] },
  };
}

export const WIZARD_STEP_COUNT = 15;
