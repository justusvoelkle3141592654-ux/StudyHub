import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRepos } from "@/data/db";
import type { Grade, GradeScale } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectDot } from "@/features/subjects/SubjectBadge";
import { formatDate } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { SETTINGS } from "@/app/settingsKeys";
import { useSetting } from "@/stores/settingsStore";
import { GradeDialog } from "./GradeDialog";
import { GradeHistoryChart } from "./GradeHistoryChart";
import { formatGradeValue, neededGrade, overallAverage, SCALE_INFO, weightedAverage } from "./gradeMath";
import { EmptyState } from "@/components/EmptyState";

function useGradeConfig() {
  const scale = useSetting<GradeScale>(SETTINGS.gradeScale, "de_1_6");
  const weighted = useSetting<boolean>(SETTINGS.gradesWeighted, true);
  return { scale, weighted };
}

/** Overview: one row per subject with its average, plus the overall average. */
export function GradesPage() {
  const { t } = useTranslation();
  const { subjects } = useSubjects();
  const { scale, weighted } = useGradeConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: grades } = useRepoQuery(() => getRepos().grades.getAll(), ["grades"]);

  const rows = useMemo(
    () =>
      subjects.map((s) => {
        const own = (grades ?? []).filter((g) => g.subject_id === s.id);
        return { subject: s, count: own.length, average: weightedAverage(own, scale, weighted) };
      }),
    [subjects, grades, scale, weighted],
  );
  const overall = overallAverage(rows.map((r) => r.average));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("nav.grades")}
        description={t("grades.scaleHint", { scale: t(`grades.scale.${scale}`) })}
        actions={
          <Button onClick={() => setDialogOpen(true)} disabled={subjects.length === 0} data-testid="grade-add">
            <Plus /> {t("grades.new")}
          </Button>
        }
      />
      {subjects.length === 0 ? (
        <EmptyState title={t("grades.noSubjects")} description={t("grades.noSubjectsHint")} action={<Button asChild><Link to="/subjects">{t("nav.subjects")}</Link></Button>} />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-baseline gap-3 p-4">
              <span className="text-sm text-muted-foreground">{t("grades.overall")}</span>
              <span className="text-3xl font-semibold tabular-nums" data-testid="grades-overall">
                {formatGradeValue(overall, scale)}
              </span>
            </CardContent>
          </Card>
          <ul className="divide-y rounded-xl border bg-card">
            {rows.map((r) => (
              <li key={r.subject.id}>
                <Link to={`/grades/${r.subject.id}`} className="flex items-center gap-3 p-3 hover:bg-accent/50" data-testid="grade-subject-row">
                  <SubjectDot color={r.subject.color} className="size-3.5" />
                  <span className="flex-1 font-medium">{r.subject.name}</span>
                  <span className="text-xs text-muted-foreground">{t("grades.count", { count: r.count })}</span>
                  <span className="w-14 text-right text-lg font-semibold tabular-nums">{formatGradeValue(r.average, scale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <GradeDialog open={dialogOpen} onOpenChange={setDialogOpen} grade={null} subjects={subjects} subjectId={null} scale={scale} weighted={weighted} />
    </div>
  );
}

/** Subject detail: grade list, history chart and target grade calculator. */
export function SubjectGradesPage() {
  const { t } = useTranslation();
  const { subjectId = "" } = useParams();
  const { subjects, get } = useSubjects();
  const { scale, weighted } = useGradeConfig();
  const subject = get(subjectId);
  const [dialog, setDialog] = useState<{ open: boolean; grade: Grade | null }>({ open: false, grade: null });
  const { data: grades } = useRepoQuery(() => getRepos().grades.getBySubject(subjectId), ["grades"], [subjectId]);
  const list = useMemo(() => [...(grades ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [grades]);
  const average = weightedAverage(list, scale, weighted);
  const info = SCALE_INFO[scale];
  const [target, setTarget] = useState("");
  const [nextWeight, setNextWeight] = useState("1");
  const targetNum = Number(target.replace(",", "."));
  const result = Number.isFinite(targetNum) && target !== "" ? neededGrade(list, targetNum, Number(nextWeight.replace(",", ".")) || 1, scale, weighted) : null;

  const remove = async (g: Grade) => {
    try {
      await getRepos().grades.softDelete(g.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("grades", "delete failed", e) });
    }
  };

  if (!subject) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link to="/grades">
          <ArrowLeft /> {t("nav.grades")}
        </Link>
      </Button>
      <PageHeader
        title={subject.name}
        description={`${t("grades.average")}: ${formatGradeValue(average, scale)}`}
        actions={
          <Button onClick={() => setDialog({ open: true, grade: null })} data-testid="grade-add">
            <Plus /> {t("grades.new")}
          </Button>
        }
      />
      {list.length === 0 ? (
        <EmptyState title={t("grades.empty")} description={t("grades.emptyHint")} />
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">{t("grades.history")}</CardTitle>
            </CardHeader>
            <CardContent>
              <GradeHistoryChart grades={list} scale={scale} color={subject.color} />
            </CardContent>
          </Card>
          <ul className="mb-4 divide-y rounded-xl border bg-card">
            {list.map((g) => (
              <li key={g.id} className="flex items-center gap-3 p-3" data-testid="grade-item">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(`${g.date}T00:00:00`)}
                    {weighted && g.weight !== 1 ? ` · ${t("grades.weightShort", { w: g.weight })}` : ""}
                    {g.scale !== scale ? ` · ${t(`grades.scale.${g.scale}`)}` : ""}
                  </p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{formatGradeValue(g.value, g.scale)}</span>
                <Button variant="ghost" size="icon-sm" aria-label={`${t("common.edit")} ${g.title}`} onClick={() => setDialog({ open: true, grade: g })}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${g.title}`} onClick={() => void remove(g)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="size-4" /> {t("grades.targetTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("grades.targetHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="target">{t("grades.targetAverage")}</Label>
              <Input id="target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={scale === "de_1_6" ? "2,0" : "12"} data-testid="target-input" />
            </div>
            {weighted && (
              <div className="space-y-1.5">
                <Label htmlFor="target-weight">{t("grades.nextWeight")}</Label>
                <Input id="target-weight" inputMode="decimal" value={nextWeight} onChange={(e) => setNextWeight(e.target.value)} />
              </div>
            )}
          </div>
          {result && (
            <p className={cn("rounded-md border p-3 text-sm", result.alreadyReached ? "border-success/50 bg-success/10" : result.achievable ? "" : "border-destructive/50 bg-destructive/10")} data-testid="target-result">
              {result.alreadyReached
                ? t("grades.targetReached")
                : result.achievable
                  ? t("grades.targetNeeded", { value: formatGradeValue(result.needed, scale) })
                  : t("grades.targetImpossible", { value: formatGradeValue(result.needed, scale), best: info.lowerIsBetter ? info.min : info.max })}
            </p>
          )}
        </CardContent>
      </Card>
      <GradeDialog open={dialog.open} onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))} grade={dialog.grade} subjects={subjects} subjectId={subjectId} scale={scale} weighted={weighted} />
    </div>
  );
}
