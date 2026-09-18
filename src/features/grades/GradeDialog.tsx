import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRepos } from "@/data/db";
import type { Grade, GradeScale, Subject } from "@/data/types";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { reportError } from "@/lib/logger";
import { todayKey } from "@/lib/dates";
import { SCALE_INFO } from "./gradeMath";

export function GradeDialog({
  open,
  onOpenChange,
  grade,
  subjects,
  subjectId,
  scale,
  weighted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grade: Grade | null;
  subjects: Subject[];
  subjectId: string | null;
  scale: GradeScale;
  weighted: boolean;
}) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [weight, setWeight] = useState("1");
  const [date, setDate] = useState(todayKey());
  const info = SCALE_INFO[grade?.scale ?? scale];

  useEffect(() => {
    if (!open) return;
    setSubject(grade?.subject_id ?? subjectId ?? subjects[0]?.id ?? null);
    setTitle(grade?.title ?? "");
    setValue(grade ? String(grade.value).replace(".", ",") : "");
    setWeight(grade ? String(grade.weight) : "1");
    setDate(grade?.date ?? todayKey());
  }, [open, grade, subjectId, subjects]);

  const numeric = Number(value.replace(",", "."));
  const valid = subject && title.trim() && Number.isFinite(numeric) && numeric >= info.min && numeric <= info.max && date;

  const save = async () => {
    if (!valid || !subject) return;
    try {
      const repos = getRepos();
      const data = { subject_id: subject, title: title.trim(), value: numeric, scale: grade?.scale ?? scale, weight: weighted ? Math.max(0, Number(weight.replace(",", ".")) || 1) : 1, date };
      if (grade) await repos.grades.update(grade.id, data);
      else await repos.grades.insert(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("grades", "save failed", e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{grade ? t("grades.edit") : t("grades.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="grade-subject">{t("subjects.subject")}</Label>
            <SubjectSelect id="grade-subject" subjects={subjects} value={subject} onChange={setSubject} allowNone={false} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade-title">{t("grades.titleLabel")}</Label>
            <Input id="grade-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("grades.titlePlaceholder")} autoFocus required data-testid="grade-title" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade-value">
                {t("grades.value")} ({info.min}–{info.max})
              </Label>
              <Input id="grade-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required aria-invalid={value !== "" && !valid} data-testid="grade-value" />
            </div>
            {weighted && (
              <div className="space-y-1.5">
                <Label htmlFor="grade-weight">{t("grades.weight")}</Label>
                <Input id="grade-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="grade-date">{t("grades.date")}</Label>
              <Input id="grade-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!valid} data-testid="grade-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
