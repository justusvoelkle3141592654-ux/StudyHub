import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { Subject, TimetableSlot, WeekType } from "@/data/types";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { reportError } from "@/lib/logger";
import { formatWeekday } from "@/lib/dates";
import { addDays } from "date-fns";
import { mondayOf } from "@/lib/dates";
import type { TimetableConfig } from "./useTimetableConfig";

export interface SlotDraft {
  weekday: number;
  start_time: string;
  end_time: string;
}

export function SlotDialog({
  open,
  onOpenChange,
  slot,
  preset,
  subjects,
  config,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slot: TimetableSlot | null;
  preset: SlotDraft | null;
  subjects: Subject[];
  config: TimetableConfig;
}) {
  const { t } = useTranslation();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:45");
  const [room, setRoom] = useState("");
  const [weekType, setWeekType] = useState<WeekType>("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubjectId(slot?.subject_id ?? subjects[0]?.id ?? null);
    setWeekday(slot?.weekday ?? preset?.weekday ?? 1);
    setStart(slot?.start_time ?? preset?.start_time ?? config.lessonTimes[0]?.start ?? "08:00");
    setEnd(slot?.end_time ?? preset?.end_time ?? config.lessonTimes[0]?.end ?? "08:45");
    setRoom(slot?.room ?? "");
    setWeekType(slot?.week_type ?? "all");
  }, [open, slot, preset, subjects, config.lessonTimes]);

  const applyLesson = (idx: number) => {
    const lt = config.lessonTimes[idx];
    if (lt) {
      setStart(lt.start);
      setEnd(lt.end);
    }
  };

  const save = async () => {
    if (start >= end) {
      toast.error(t("timetable.invalidTime"));
      return;
    }
    setSaving(true);
    try {
      const repos = getRepos();
      const data = { subject_id: subjectId, weekday, start_time: start, end_time: end, room: room.trim() || null, week_type: weekType };
      if (slot) await repos.timetable.update(slot.id, data);
      else await repos.timetable.insert(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("timetable", "save failed", e) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!slot) return;
    await getRepos().timetable.softDelete(slot.id);
    onOpenChange(false);
  };

  const monday = mondayOf(new Date());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot ? t("timetable.editSlot") : t("timetable.newSlot")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="slot-subject">{t("subjects.subject")}</Label>
            <SubjectSelect id="slot-subject" subjects={subjects} value={subjectId} onChange={setSubjectId} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slot-weekday">{t("timetable.weekday")}</Label>
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger id="slot-weekday"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: config.days }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {formatWeekday(addDays(monday, i))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-lesson">{t("timetable.lesson")}</Label>
              <Select onValueChange={(v) => applyLesson(Number(v))}>
                <SelectTrigger id="slot-lesson"><SelectValue placeholder={t("timetable.pickLesson")} /></SelectTrigger>
                <SelectContent>
                  {config.lessonTimes.map((lt, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i + 1}. ({lt.start}–{lt.end})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-start">{t("timetable.start")}</Label>
              <Input id="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end">{t("timetable.end")}</Label>
              <Input id="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-room">{t("subjects.room")}</Label>
              <Input id="slot-room" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            {config.abWeeks && (
              <div className="space-y-1.5">
                <Label htmlFor="slot-week">{t("timetable.weekType")}</Label>
                <Select value={weekType} onValueChange={(v) => setWeekType(v as WeekType)}>
                  <SelectTrigger id="slot-week"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("timetable.everyWeek")}</SelectItem>
                    <SelectItem value="A">{t("timetable.weekA")}</SelectItem>
                    <SelectItem value="B">{t("timetable.weekB")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            {slot ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => void remove()}>
                {t("common.delete")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
