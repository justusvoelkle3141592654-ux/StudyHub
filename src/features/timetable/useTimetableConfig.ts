import { SETTINGS } from "@/app/settingsKeys";
import { useSetting } from "@/stores/settingsStore";
import { defaultLessonTimes } from "@/features/setup/types";

export interface TimetableConfig {
  days: number;
  lessonsPerDay: number;
  lessonTimes: Array<{ start: string; end: string }>;
  abWeeks: boolean;
  weekAStart: string | null;
}

export function useTimetableConfig(): TimetableConfig {
  const days = useSetting<number>(SETTINGS.timetableDays, 5);
  const lessonsPerDay = useSetting<number>(SETTINGS.timetableLessonsPerDay, 8);
  const lessonTimes = useSetting<Array<{ start: string; end: string }>>(SETTINGS.timetableLessonTimes, defaultLessonTimes(8));
  const abWeeks = useSetting<boolean>(SETTINGS.timetableAbWeeks, false);
  const weekAStart = useSetting<string | null>(SETTINGS.timetableWeekAStart, null);
  return { days, lessonsPerDay, lessonTimes, abWeeks, weekAStart };
}
