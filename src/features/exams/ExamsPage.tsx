import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { differenceInCalendarDays } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { getRepos } from "@/data/db";
import type { Exam } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectBadge } from "@/features/subjects/SubjectBadge";
import { formatDate, todayKey } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { ExamDialog } from "./ExamDialog";
import { EmptyState } from "@/components/EmptyState";

export function ExamsPage() {
  const { t } = useTranslation();
  const { subjects, get } = useSubjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const { data } = useRepoQuery(() => getRepos().exams.getAll(), ["exams"]);
  const exams = useMemo(() => data ?? [], [data]);
  const today = todayKey();
  const upcoming = exams.filter((e) => e.date >= today);
  const past = exams.filter((e) => e.date < today).reverse();

  const remove = async (exam: Exam) => {
    try {
      await getRepos().exams.softDelete(exam.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("exams", "delete failed", e) });
    }
  };

  const renderExam = (exam: Exam) => {
    const days = differenceInCalendarDays(new Date(`${exam.date}T00:00:00`), new Date());
    return (
      <li key={exam.id} className="flex items-start gap-3 p-3" data-testid="exam-item">
        <div className={cn("flex w-14 shrink-0 flex-col items-center rounded-md border py-1 text-center", days >= 0 && days <= 3 && "border-destructive/50 text-destructive")}>
          <span className="text-lg font-semibold leading-none">{formatDate(`${exam.date}T00:00:00`, "d")}</span>
          <span className="text-[11px] uppercase text-muted-foreground">{formatDate(`${exam.date}T00:00:00`, "LLL")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{exam.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <SubjectBadge subject={get(exam.subject_id)} />
            <span>{days === 0 ? t("common.today") : days > 0 ? t("exams.inDays", { count: days }) : t("exams.daysAgo", { count: -days })}</span>
            {exam.weight !== 1 && <span>{t("exams.weightShort", { w: exam.weight })}</span>}
          </div>
          {exam.topics && <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{exam.topics}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`${t("common.edit")} ${exam.title}`} onClick={() => { setEditing(exam); setDialogOpen(true); }}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${exam.title}`} onClick={() => void remove(exam)}>
          <Trash2 />
        </Button>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("nav.exams")}
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="exam-add">
            <Plus /> {t("exams.new")}
          </Button>
        }
      />
      {exams.length === 0 ? (
        <EmptyState title={t("exams.emptyTitle")} description={t("exams.emptyHint")} />
      ) : (
        <div className="space-y-6">
          <section aria-label={t("exams.upcoming")}>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("exams.upcoming")} ({upcoming.length})</h2>
            {upcoming.length ? <ul className="divide-y rounded-xl border bg-card">{upcoming.map(renderExam)}</ul> : <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
          </section>
          {past.length > 0 && (
            <section aria-label={t("exams.past")}>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("exams.past")} ({past.length})</h2>
              <ul className="divide-y rounded-xl border bg-card opacity-80">{past.map(renderExam)}</ul>
            </section>
          )}
        </div>
      )}
      <ExamDialog open={dialogOpen} onOpenChange={setDialogOpen} exam={editing} subjects={subjects} />
    </div>
  );
}
