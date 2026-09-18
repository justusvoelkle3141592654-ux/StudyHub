import { useTranslation } from "react-i18next";
import { StepShell, FieldRow } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { defaultLessonTimes } from "../types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Step08Timetable() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);

  const setLessons = (n: number) => {
    const count = Math.min(Math.max(1, n), 14);
    const times = [...draft.lessonTimes];
    if (times.length < count) times.push(...defaultLessonTimes(count).slice(times.length));
    patch({ lessonsPerDay: count, lessonTimes: times.slice(0, count) });
  };
  const setTime = (i: number, key: "start" | "end", value: string) =>
    patch({ lessonTimes: draft.lessonTimes.map((lt, j) => (j === i ? { ...lt, [key]: value } : lt)) });

  return (
    <StepShell title={t("setup.timetable.title")} description={t("setup.timetable.description")}>
      <FieldRow label={t("setup.timetable.days")} htmlFor="days">
        <Select value={String(draft.timetableDays)} onValueChange={(v) => patch({ timetableDays: Number(v) as 5 | 6 })}>
          <SelectTrigger id="days"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">{t("setup.timetable.days5")}</SelectItem>
            <SelectItem value="6">{t("setup.timetable.days6")}</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label={t("setup.timetable.lessonsPerDay")} htmlFor="lessons">
        <Input id="lessons" type="number" min={1} max={14} value={draft.lessonsPerDay} onChange={(e) => setLessons(Number(e.target.value))} />
      </FieldRow>
      <FieldRow label={t("setup.timetable.abWeeks")} htmlFor="abweeks" hint={t("setup.timetable.abWeeksHint")}>
        <Switch id="abweeks" checked={draft.abWeeks} onCheckedChange={(v) => patch({ abWeeks: v })} />
      </FieldRow>
      <div>
        <p className="mb-2 text-sm font-medium">{t("setup.timetable.times")}</p>
        <div className="grid max-h-64 grid-cols-[auto_1fr_1fr] items-center gap-2 overflow-y-auto rounded-lg border p-3 text-sm">
          {draft.lessonTimes.map((lt, i) => (
            <div key={i} className="contents">
              <span className="text-muted-foreground">{i + 1}.</span>
              <Input type="time" aria-label={`${t("setup.timetable.start")} ${i + 1}`} value={lt.start} onChange={(e) => setTime(i, "start", e.target.value)} />
              <Input type="time" aria-label={`${t("setup.timetable.end")} ${i + 1}`} value={lt.end} onChange={(e) => setTime(i, "end", e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
