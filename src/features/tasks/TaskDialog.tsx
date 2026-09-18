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
import type { RecurrenceFrequency, Subject, Task, TaskPriority } from "@/data/types";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { reportError } from "@/lib/logger";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import { parseRecurrence, serializeRecurrence } from "./recurrence";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";

/** Reminder lead options in minutes; "none" disables, "custom" keeps an existing value. */
const LEADS = [0, 15, 60, 180, 1440, 2880] as const;

export function reminderFromLead(dueIso: string | null, lead: string): string | null {
  if (!dueIso || lead === "none") return null;
  const minutes = Number(lead);
  if (!Number.isFinite(minutes)) return null;
  return new Date(new Date(dueIso).getTime() - minutes * 60_000).toISOString();
}

export function leadFromReminder(dueIso: string | null, reminderIso: string | null): string {
  if (!dueIso || !reminderIso) return "none";
  const diff = Math.round((new Date(dueIso).getTime() - new Date(reminderIso).getTime()) / 60_000);
  return (LEADS as readonly number[]).includes(diff) ? String(diff) : "none";
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  subjects,
  defaultSubjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: Task | null;
  subjects: Subject[];
  defaultSubjectId?: string | null;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(2);
  const [lead, setLead] = useState("none");
  const [freq, setFreq] = useState<RecurrenceFrequency | "none">("none");
  const [interval, setInterval] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setSubjectId(task?.subject_id ?? defaultSubjectId ?? null);
    setDue(toLocalInputValue(task?.due_at ?? null));
    setPriority(task?.priority ?? 2);
    const notificationsOn = getSetting<boolean>(SETTINGS.notificationsEnabled, false);
    setLead(task ? leadFromReminder(task.due_at, task.reminder_at) : notificationsOn ? String(getSetting<number>(SETTINGS.notificationsLeadMinutes, 60)) : "none");
    const rec = parseRecurrence(task?.recurrence ?? null);
    setFreq(rec?.freq ?? "none");
    setInterval(rec?.interval ?? 1);
  }, [open, task, defaultSubjectId]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const dueIso = fromLocalInputValue(due);
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId,
        due_at: dueIso,
        priority,
        reminder_at: reminderFromLead(dueIso, lead),
        recurrence: serializeRecurrence(freq === "none" ? null : { freq, interval: Math.max(1, interval) }),
      };
      const repos = getRepos();
      if (task) await repos.tasks.update(task.id, data);
      else await repos.tasks.insert(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("tasks", "save failed", e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? t("tasks.edit") : t("tasks.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-title">{t("tasks.titleLabel")}</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required data-testid="task-title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">{t("tasks.description")}</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-subject">{t("subjects.subject")}</Label>
              <SubjectSelect id="task-subject" subjects={subjects} value={subjectId} onChange={setSubjectId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">{t("tasks.due")}</Label>
              <Input id="task-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} data-testid="task-due" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">{t("tasks.priority")}</Label>
              <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v) as TaskPriority)}>
                <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("tasks.prio.1")}</SelectItem>
                  <SelectItem value="2">{t("tasks.prio.2")}</SelectItem>
                  <SelectItem value="3">{t("tasks.prio.3")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-reminder">{t("tasks.reminder")}</Label>
              <Select value={lead} onValueChange={setLead} disabled={!due}>
                <SelectTrigger id="task-reminder"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {LEADS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m === 0 ? t("tasks.leadAtDue") : m < 60 ? t("setup.notifications.minutes", { n: m }) : m < 1440 ? t("setup.notifications.hours", { n: m / 60 }) : t("setup.notifications.days", { n: m / 1440 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-recur">{t("tasks.recurrence")}</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as RecurrenceFrequency | "none")}>
                <SelectTrigger id="task-recur"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  <SelectItem value="daily">{t("tasks.recur.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("tasks.recur.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("tasks.recur.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {freq !== "none" && (
              <div className="space-y-1.5">
                <Label htmlFor="task-interval">{t("tasks.recur.interval")}</Label>
                <Input id="task-interval" type="number" min={1} max={52} value={interval} onChange={(e) => setInterval(Number(e.target.value) || 1)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !title.trim()} data-testid="task-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
