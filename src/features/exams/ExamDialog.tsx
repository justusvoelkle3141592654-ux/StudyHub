import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { Exam, Subject } from "@/data/types";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { reportError } from "@/lib/logger";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";

const LEAD_DAYS = [1, 2, 3, 7, 14] as const;

export function ExamDialog({ open, onOpenChange, exam, subjects }: { open: boolean; onOpenChange: (o: boolean) => void; exam: Exam | null; subjects: Subject[] }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [topics, setTopics] = useState("");
  const [weight, setWeight] = useState(1);
  const [leadDays, setLeadDays] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(exam?.title ?? "");
    setSubjectId(exam?.subject_id ?? subjects[0]?.id ?? null);
    setDate(exam?.date ?? "");
    setTopics(exam?.topics ?? "");
    setWeight(exam?.weight ?? 1);
    if (exam?.reminder_at && exam.date) {
      const diff = Math.round((new Date(`${exam.date}T08:00:00`).getTime() - new Date(exam.reminder_at).getTime()) / 86_400_000);
      setLeadDays((LEAD_DAYS as readonly number[]).includes(diff) ? String(diff) : "none");
    } else {
      const on = getSetting<boolean>(SETTINGS.notificationsEnabled, false);
      setLeadDays(on ? "1" : "none");
    }
  }, [open, exam, subjects]);

  const save = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      // Reminder fires at 08:00 local time `leadDays` before the exam.
      const reminder = leadDays === "none" ? null : new Date(new Date(`${date}T08:00:00`).getTime() - Number(leadDays) * 86_400_000).toISOString();
      const data = { title: title.trim(), subject_id: subjectId, date, topics: topics.trim() || null, weight: Number(weight) || 1, reminder_at: reminder };
      const repos = getRepos();
      if (exam) await repos.exams.update(exam.id, data);
      else await repos.exams.insert(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("exams", "save failed", e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exam ? t("exams.edit") : t("exams.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="exam-title">{t("exams.titleLabel")}</Label>
            <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required data-testid="exam-title" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exam-subject">{t("subjects.subject")}</Label>
              <SubjectSelect id="exam-subject" subjects={subjects} value={subjectId} onChange={setSubjectId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-date">{t("exams.date")}</Label>
              <Input id="exam-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required data-testid="exam-date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-weight">{t("exams.weight")}</Label>
              <Input id="exam-weight" type="number" min={0} step={0.5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-reminder">{t("tasks.reminder")}</Label>
              <Select value={leadDays} onValueChange={setLeadDays}>
                <SelectTrigger id="exam-reminder"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {LEAD_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {t("exams.daysBefore", { count: d })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-topics">{t("exams.topics")}</Label>
            <Textarea id="exam-topics" value={topics} onChange={(e) => setTopics(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !date} data-testid="exam-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
