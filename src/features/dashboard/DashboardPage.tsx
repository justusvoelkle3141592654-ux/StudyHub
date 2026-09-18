import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { addDays, isBefore, startOfDay } from "date-fns";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CheckSquare, FileText, GraduationCap, GripVertical, Layers, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getRepos } from "@/data/db";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectDot } from "@/features/subjects/SubjectBadge";
import { useTimetableConfig } from "@/features/timetable/useTimetableConfig";
import { toggleTaskDone } from "@/features/tasks/taskActions";
import { formatDate, formatDateTime, isoWeekday, todayKey, weekTypeOf } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PROFILE_TILES, type DashboardTile } from "@/app/modules";
import { SETTINGS } from "@/app/settingsKeys";
import { useAppStore } from "@/stores/appStore";
import { useSetting, useSettingsStore } from "@/stores/settingsStore";

function SortableTile({ id, children }: { id: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative", isDragging && "z-10 opacity-80")}>
      <button
        type="button"
        className="absolute right-2 top-3 z-10 cursor-grab rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("dashboard.reorder")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {children}
    </div>
  );
}

function Tile({ title, icon, to, children }: { title: string; icon: React.ReactNode; to: string; children: React.ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader className="pr-10">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-primary">{icon}</span>
          <Link to={to} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.profile);
  const storedLayout = useSetting<DashboardTile[] | null>(SETTINGS.dashboardLayout, null);
  const setSetting = useSettingsStore((s) => s.set);
  const [order, setOrder] = useState<DashboardTile[]>(() => storedLayout ?? PROFILE_TILES[profile]);
  useEffect(() => {
    setOrder(storedLayout ?? PROFILE_TILES[profile]);
  }, [storedLayout, profile]);

  const { get } = useSubjects();
  const config = useTimetableConfig();
  const today = new Date();
  const weekday = isoWeekday(today);
  const weekType = weekTypeOf(today, config.weekAStart);

  const { data: slots } = useRepoQuery(() => getRepos().timetable.getByWeekday(weekday), ["timetable_slots"], [weekday]);
  const { data: tasks } = useRepoQuery(() => getRepos().tasks.getDueUntil(new Date(new Date().setHours(23, 59, 59, 999)).toISOString()), ["tasks"]);
  const { data: exams } = useRepoQuery(() => getRepos().exams.getBetween(todayKey(), formatDate(addDays(new Date(), 14), "yyyy-MM-dd")), ["exams"]);
  const { data: dueCards } = useRepoQuery(() => getRepos().flashcards.countDue(todayKey()), ["flashcards", "flashcard_reviews"]);
  const { data: notes } = useRepoQuery(() => getRepos().notes.getRecent(5), ["notes"]);
  const { data: documents } = useRepoQuery(() => getRepos().documents.getRecent(5), ["documents"]);

  const todaySlots = useMemo(() => (slots ?? []).filter((s) => !config.abWeeks || s.week_type === "all" || s.week_type === weekType), [slots, config.abWeeks, weekType]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(active.id as DashboardTile), order.indexOf(over.id as DashboardTile));
    setOrder(next);
    void setSetting(SETTINGS.dashboardLayout, next);
  };

  const tiles: Record<DashboardTile, React.ReactNode> = {
    timetable: (
      <Tile title={t("dashboard.todayTimetable")} icon={<CalendarDays className="size-4" />} to="/timetable">
        {todaySlots.length === 0 ? (
          <p className="text-muted-foreground">{t("dashboard.noLessons")}</p>
        ) : (
          <ul className="space-y-1">
            {todaySlots.map((s) => {
              const subject = get(s.subject_id);
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{s.start_time}–{s.end_time}</span>
                  <SubjectDot color={subject?.color ?? "#888"} />
                  <span className="truncate">{subject?.name ?? "—"}</span>
                  {s.room && <span className="ml-auto text-xs text-muted-foreground">{s.room}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    ),
    tasks: (
      <Tile title={t("dashboard.dueTasks")} icon={<CheckSquare className="size-4" />} to="/tasks">
        {(tasks ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t("dashboard.noTasks")}</p>
        ) : (
          <ul className="space-y-1.5">
            {(tasks ?? []).slice(0, 6).map((task) => {
              const overdue = task.due_at && isBefore(new Date(task.due_at), startOfDay(today));
              return (
                <li key={task.id} className="flex items-center gap-2">
                  <Checkbox aria-label={task.title} onCheckedChange={() => void toggleTaskDone(task)} />
                  <span className="truncate">{task.title}</span>
                  {task.due_at && <span className={cn("ml-auto shrink-0 text-xs text-muted-foreground", overdue && "text-destructive")}>{formatDateTime(task.due_at)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    ),
    exams: (
      <Tile title={t("dashboard.upcomingExams")} icon={<GraduationCap className="size-4" />} to="/exams">
        {(exams ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t("dashboard.noExams")}</p>
        ) : (
          <ul className="space-y-1">
            {(exams ?? []).map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <SubjectDot color={get(e.subject_id)?.color ?? "#888"} />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(`${e.date}T00:00:00`)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    ),
    flashcards: (
      <Tile title={t("dashboard.flashcards")} icon={<Layers className="size-4" />} to="/flashcards">
        <p className="text-3xl font-semibold tabular-nums">{dueCards ?? 0}</p>
        <p className="text-muted-foreground">{t("dashboard.cardsDueToday")}</p>
      </Tile>
    ),
    notes: (
      <Tile title={t("dashboard.recentNotes")} icon={<NotebookPen className="size-4" />} to="/notes">
        {(notes ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <ul className="space-y-1">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="flex items-center gap-2">
                <Link to={`/notes/${n.id}`} className="truncate hover:underline">{n.title}</Link>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(n.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    ),
    documents: (
      <Tile title={t("dashboard.recentDocuments")} icon={<FileText className="size-4" />} to="/documents">
        {(documents ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t("common.noData")}</p>
        ) : (
          <ul className="space-y-1">
            {(documents ?? []).map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Link to={`/documents/${d.id}`} className="truncate hover:underline">{d.title}</Link>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(d.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    ),
  };

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={formatDate(today, "EEEE, PPP")} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="dashboard-tiles">
            {order.map((id) => (
              <SortableTile key={id} id={id}>
                {tiles[id]}
              </SortableTile>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
