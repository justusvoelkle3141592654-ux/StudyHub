import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, addMonths, endOfDay, endOfWeek, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { Task } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { SubjectBadge } from "@/features/subjects/SubjectBadge";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/logger";
import { TaskDialog } from "./TaskDialog";
import { toggleTaskDone } from "./taskActions";
import { CalendarMonth, type CalendarItem } from "./CalendarMonth";
import { EmptyState } from "@/components/EmptyState";

type StatusFilter = "open" | "done" | "all";
type DueFilter = "all" | "overdue" | "today" | "week" | "nodate";

const PRIORITY_CLASS: Record<number, string> = { 1: "text-destructive", 2: "text-warning", 3: "text-muted-foreground" };

export function TasksPage() {
  const { t } = useTranslation();
  const { subjects, get } = useSubjects();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const { data } = useRepoQuery(() => getRepos().tasks.getAll(), ["tasks"]);
  const { data: examData } = useRepoQuery(() => getRepos().exams.getAll(), ["exams"]);
  const tasks = useMemo(() => data ?? [], [data]);

  const now = new Date();
  const filtered = useMemo(() => {
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return tasks.filter((task) => {
      if (status !== "all" && task.status !== status) return false;
      if (subjectFilter && task.subject_id !== subjectFilter) return false;
      const due = task.due_at ? new Date(task.due_at) : null;
      switch (dueFilter) {
        case "overdue":
          return !!due && isBefore(due, startOfDay(now)) && task.status === "open";
        case "today":
          return !!due && due <= todayEnd && due >= startOfDay(now);
        case "week":
          return !!due && due <= weekEnd;
        case "nodate":
          return !due;
        default:
          return true;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, status, subjectFilter, dueFilter]);

  const groups = useMemo(() => {
    const g: Record<string, Task[]> = { overdue: [], today: [], week: [], later: [], nodate: [], done: [] };
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    for (const task of filtered) {
      if (task.status === "done") g.done.push(task);
      else if (!task.due_at) g.nodate.push(task);
      else {
        const due = new Date(task.due_at);
        if (isBefore(due, startOfDay(now))) g.overdue.push(task);
        else if (due <= todayEnd) g.today.push(task);
        else if (due <= weekEnd) g.week.push(task);
        else g.later.push(task);
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const remove = async (task: Task) => {
    try {
      await getRepos().tasks.softDelete(task.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("tasks", "delete failed", e) });
    }
  };
  const toggle = async (task: Task) => {
    try {
      await toggleTaskDone(task);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("tasks", "toggle failed", e) });
    }
  };
  const openEdit = (task: Task | null) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const calendarItems: CalendarItem[] = useMemo(
    () => [
      ...tasks
        .filter((x) => x.due_at)
        .map((x) => ({ id: x.id, date: new Date(x.due_at!).toISOString().slice(0, 10), label: x.title, color: get(x.subject_id)?.color ?? "#888", kind: "task" as const, done: x.status === "done", onClick: () => openEdit(x) })),
      ...(examData ?? []).map((x) => ({ id: x.id, date: x.date, label: `${t("nav.exams")}: ${x.title}`, color: get(x.subject_id)?.color ?? "#888", kind: "exam" as const })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, examData, get],
  );

  const renderTask = (task: Task) => {
    const subject = get(task.subject_id);
    const overdue = task.status === "open" && task.due_at && isBefore(new Date(task.due_at), startOfDay(now));
    return (
      <li key={task.id} className="flex items-start gap-3 p-3" data-testid="task-item">
        <Checkbox className="mt-0.5" checked={task.status === "done"} onCheckedChange={() => void toggle(task)} aria-label={`${task.title} ${t("tasks.markDone")}`} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <SubjectBadge subject={subject} />
            {task.due_at && <span className={cn(overdue && "font-medium text-destructive")}>{formatDateTime(task.due_at)}</span>}
            <span className={PRIORITY_CLASS[task.priority]}>{t(`tasks.prio.${task.priority}`)}</span>
            {task.recurrence && <Repeat className="size-3" aria-label={t("tasks.recurrence")} />}
          </div>
          {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`${t("common.edit")} ${task.title}`} onClick={() => openEdit(task)}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${task.title}`} onClick={() => void remove(task)}>
          <Trash2 />
        </Button>
      </li>
    );
  };

  const groupOrder: Array<keyof typeof groups> = ["overdue", "today", "week", "later", "nodate", "done"];

  return (
    <div>
      <PageHeader
        title={t("nav.tasks")}
        actions={
          <>
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
              <TabsList>
                <TabsTrigger value="list">{t("tasks.list")}</TabsTrigger>
                <TabsTrigger value="calendar">{t("tasks.calendar")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => openEdit(null)} data-testid="task-add">
              <Plus /> {t("tasks.new")}
            </Button>
          </>
        }
      />
      {view === "list" ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="w-40">
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger aria-label={t("tasks.status")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("tasks.open")}</SelectItem>
                  <SelectItem value="done">{t("tasks.done")}</SelectItem>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as DueFilter)}>
                <SelectTrigger aria-label={t("tasks.due")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("tasks.filter.allDates")}</SelectItem>
                  <SelectItem value="overdue">{t("tasks.group.overdue")}</SelectItem>
                  <SelectItem value="today">{t("tasks.group.today")}</SelectItem>
                  <SelectItem value="week">{t("tasks.group.week")}</SelectItem>
                  <SelectItem value="nodate">{t("tasks.group.nodate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <SubjectSelect subjects={subjects} value={subjectFilter} onChange={setSubjectFilter} allLabel={t("tasks.filter.allSubjects")} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title={t("tasks.emptyTitle")} description={t("tasks.emptyHint")} />
          ) : (
            <div className="space-y-4">
              {groupOrder
                .filter((k) => groups[k].length)
                .map((k) => (
                  <section key={k} aria-label={t(`tasks.group.${k}`)}>
                    <h2 className={cn("mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", k === "overdue" && "text-destructive")}>
                      {t(`tasks.group.${k}`)} ({groups[k].length})
                    </h2>
                    <ul className="divide-y rounded-xl border bg-card">{groups[k].map(renderTask)}</ul>
                  </section>
                ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label={t("common.back")} onClick={() => setMonth((m) => addMonths(m, -1))}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
              {t("common.today")}
            </Button>
            <Button variant="outline" size="icon-sm" aria-label={t("common.next")} onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight />
            </Button>
            <span className="text-sm font-medium">{formatDate(month, "LLLL yyyy")}</span>
          </div>
          <CalendarMonth month={month} items={calendarItems} />
          <p className="mt-2 text-xs text-muted-foreground">{t("tasks.calendarHint", { date: formatDate(addDays(now, 0)) })}</p>
        </>
      )}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} subjects={subjects} defaultSubjectId={subjectFilter} />
    </div>
  );
}
