import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, addWeeks, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRepos } from "@/data/db";
import type { TimetableSlot } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { formatDate, formatWeekday, isoWeekday, minutesOf, mondayOf, toDateKey, weekTypeOf } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { SETTINGS } from "@/app/settingsKeys";
import { useSettingsStore } from "@/stores/settingsStore";
import { SlotDialog, type SlotDraft } from "./SlotDialog";
import { useTimetableConfig } from "./useTimetableConfig";
import { EmptyState } from "@/components/EmptyState";

const PX_PER_MINUTE = 1.6;

export function TimetablePage() {
  const { t } = useTranslation();
  const config = useTimetableConfig();
  const { subjects, get } = useSubjects();
  const setSetting = useSettingsStore((s) => s.set);
  const [view, setView] = useState<"week" | "day">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [preset, setPreset] = useState<SlotDraft | null>(null);

  const { data } = useRepoQuery(() => getRepos().timetable.getAll(), ["timetable_slots"]);
  const slots = useMemo(() => data ?? [], [data]);

  const monday = mondayOf(anchor);
  const weekType = weekTypeOf(anchor, config.weekAStart);
  const visibleSlots = useMemo(
    () => slots.filter((s) => !config.abWeeks || s.week_type === "all" || s.week_type === weekType),
    [slots, config.abWeeks, weekType],
  );

  const { minStart, maxEnd } = useMemo(() => {
    const starts = [...config.lessonTimes.map((l) => minutesOf(l.start)), ...visibleSlots.map((s) => minutesOf(s.start_time))];
    const ends = [...config.lessonTimes.map((l) => minutesOf(l.end)), ...visibleSlots.map((s) => minutesOf(s.end_time))];
    return { minStart: Math.min(8 * 60, ...starts), maxEnd: Math.max(16 * 60, ...ends) };
  }, [config.lessonTimes, visibleSlots]);
  const gridHeight = (maxEnd - minStart) * PX_PER_MINUTE;

  const openNew = (weekday: number, lessonIndex?: number) => {
    const lt = lessonIndex !== undefined ? config.lessonTimes[lessonIndex] : config.lessonTimes[0];
    setEditing(null);
    setPreset({ weekday, start_time: lt?.start ?? "08:00", end_time: lt?.end ?? "08:45" });
    setDialogOpen(true);
  };
  const openEdit = (slot: TimetableSlot) => {
    setEditing(slot);
    setPreset(null);
    setDialogOpen(true);
  };

  const days = view === "week" ? Array.from({ length: config.days }, (_, i) => addDays(monday, i)) : [anchor];
  const today = new Date();

  const renderDayColumn = (day: Date) => {
    const wd = isoWeekday(day);
    const daySlots = visibleSlots.filter((s) => s.weekday === wd);
    return (
      <div key={toDateKey(day)} className="relative min-w-0 flex-1 border-l" style={{ height: gridHeight }}>
        {config.lessonTimes.map((lt, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${t("timetable.newSlot")} ${formatWeekday(day)} ${i + 1}`}
            onClick={() => openNew(wd, i)}
            className="absolute inset-x-0 border-t border-dashed border-border/60 hover:bg-accent/40"
            style={{ top: (minutesOf(lt.start) - minStart) * PX_PER_MINUTE, height: (minutesOf(lt.end) - minutesOf(lt.start)) * PX_PER_MINUTE }}
          />
        ))}
        {daySlots.map((s) => {
          const subject = get(s.subject_id);
          const top = (minutesOf(s.start_time) - minStart) * PX_PER_MINUTE;
          const height = Math.max(24, (minutesOf(s.end_time) - minutesOf(s.start_time)) * PX_PER_MINUTE);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => openEdit(s)}
              className="absolute inset-x-0.5 overflow-hidden rounded-md border-l-4 bg-card p-1 text-left text-xs shadow-xs hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ top, height, borderLeftColor: subject?.color ?? "#999", backgroundColor: `${subject?.color ?? "#999"}22` }}
              data-testid="timetable-slot"
            >
              <span className="block truncate font-medium">{subject?.name ?? t("subjects.noSubject")}</span>
              <span className="block truncate text-muted-foreground">
                {s.start_time}–{s.end_time}
                {s.room ? ` · ${s.room}` : ""}
                {config.abWeeks && s.week_type !== "all" ? ` · ${s.week_type}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t("nav.timetable")}
        actions={
          <>
            <Tabs value={view} onValueChange={(v) => setView(v as "week" | "day")}>
              <TabsList>
                <TabsTrigger value="week">{t("timetable.week")}</TabsTrigger>
                <TabsTrigger value="day">{t("timetable.day")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => openNew(view === "day" ? isoWeekday(anchor) : 1)} data-testid="timetable-add">
              <Plus /> {t("timetable.newSlot")}
            </Button>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label={t("common.back")} onClick={() => setAnchor((a) => (view === "week" ? addWeeks(a, -1) : addDays(a, -1)))}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
          {t("common.today")}
        </Button>
        <Button variant="outline" size="icon-sm" aria-label={t("common.next")} onClick={() => setAnchor((a) => (view === "week" ? addWeeks(a, 1) : addDays(a, 1)))}>
          <ChevronRight />
        </Button>
        <span className="text-sm font-medium">
          {view === "week" ? `${formatDate(monday)} – ${formatDate(addDays(monday, config.days - 1))}` : `${formatWeekday(anchor)}, ${formatDate(anchor)}`}
        </span>
        {config.abWeeks && (
          <span className="ml-auto inline-flex items-center gap-2 text-sm">
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{t("timetable.weekLabel", { type: weekType })}</span>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void setSetting(SETTINGS.timetableWeekAStart, weekType === "A" ? toDateKey(addDays(monday, 7)) : toDateKey(monday))}>
              {t("timetable.toggleParity")}
            </Button>
          </span>
        )}
      </div>

      {subjects.length === 0 && slots.length === 0 ? (
        <EmptyState title={t("timetable.emptyTitle")} description={t("timetable.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="flex min-w-[560px]">
            <div className="w-12 shrink-0">
              <div className="h-9 border-b" />
              <div className="relative" style={{ height: gridHeight }}>
                {config.lessonTimes.map((lt, i) => (
                  <div key={i} className="absolute right-1 text-[10px] leading-none text-muted-foreground" style={{ top: (minutesOf(lt.start) - minStart) * PX_PER_MINUTE + 2 }}>
                    <span className="font-medium">{i + 1}.</span>
                    <br />
                    {lt.start}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex h-9 border-b">
                {days.map((d) => (
                  <div key={toDateKey(d)} className={cn("flex flex-1 items-center justify-center border-l text-sm font-medium", isSameDay(d, today) && "bg-primary/10 text-primary")}>
                    {formatWeekday(d, view === "week")} <span className="ml-1 text-xs font-normal text-muted-foreground">{formatDate(d, "d.M.")}</span>
                  </div>
                ))}
              </div>
              <div className="flex">{days.map(renderDayColumn)}</div>
            </div>
          </div>
        </div>
      )}
      <SlotDialog open={dialogOpen} onOpenChange={setDialogOpen} slot={editing} preset={preset} subjects={subjects} config={config} />
    </div>
  );
}
