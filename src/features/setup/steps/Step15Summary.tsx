import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Button } from "@/components/ui/button";

export function Step15Summary() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const setStep = useSetupStore((s) => s.setStep);
  const yesNo = (v: boolean) => (v ? t("common.yes") : t("common.no"));
  const importCount = draft.import.grades.length + draft.import.tasks.length + draft.import.cards.length + draft.import.notes.length;

  const rows: Array<{ step: number; label: string; value: string }> = [
    { step: 1, label: t("settings.language"), value: draft.language === "de" ? "Deutsch" : "English" },
    { step: 2, label: t("setup.profile.title"), value: t(`setup.profile.${draft.profile}`) },
    { step: 3, label: t("setup.mode.title"), value: draft.mode === "cloud" ? t("setup.mode.cloud") : t("setup.mode.local") },
    { step: 5, label: t("setup.database.title"), value: draft.dbPath ?? t("setup.summary.default") },
    { step: 6, label: t("setup.workingFolder.title"), value: draft.workingFolder ?? t("setup.summary.default") },
    { step: 7, label: t("setup.subjects.subjects"), value: draft.subjects.length ? draft.subjects.map((s) => s.name).join(", ") : t("common.none") },
    { step: 8, label: t("setup.timetable.title"), value: t("setup.summary.timetable", { days: draft.timetableDays, lessons: draft.lessonsPerDay, ab: yesNo(draft.abWeeks) }) },
    { step: 9, label: t("setup.grades.title"), value: draft.gradeScale === "none" ? t("setup.grades.none") : `${t(`grades.scale.${draft.gradeScale}`)}${draft.gradesWeighted ? ` · ${t("setup.grades.weighted")}` : ""}` },
    { step: 10, label: t("setup.flashcards.title"), value: `${draft.flashcardsDailyNew} ${t("setup.flashcards.perDay")} · ${t(`setup.flashcards.${draft.flashcardsIntensity}`)}` },
    { step: 11, label: t("setup.notifications.title"), value: draft.notificationsEnabled ? `${t("common.yes")}${draft.dailyReminderEnabled ? ` · ${draft.dailyReminderTime}` : ""}` : t("common.no") },
    { step: 12, label: t("setup.ai.title"), value: draft.aiEnabled && draft.aiApiKey ? t("setup.ai.on") : t("setup.ai.off") },
    { step: 13, label: t("setup.appearance.title"), value: `${t(`theme.${draft.theme}`)} · ${t(`settings.font${draft.fontSize[0].toUpperCase()}${draft.fontSize.slice(1)}`)}` },
    { step: 14, label: t("setup.import.title"), value: importCount ? t("setup.import.count", { count: importCount }) : t("common.none") },
  ];

  return (
    <StepShell title={t("setup.summary.title")} description={t("setup.summary.description")}>
      <dl className="divide-y rounded-lg border">
        {rows.map((r) => (
          <div key={r.step} className="flex items-center gap-3 p-3">
            <dt className="w-40 shrink-0 text-sm text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 flex-1 truncate text-sm" title={r.value}>
              {r.value}
            </dd>
            <Button variant="ghost" size="icon-sm" aria-label={`${t("common.edit")}: ${r.label}`} onClick={() => setStep(r.step)}>
              <Pencil />
            </Button>
          </div>
        ))}
      </dl>
    </StepShell>
  );
}
