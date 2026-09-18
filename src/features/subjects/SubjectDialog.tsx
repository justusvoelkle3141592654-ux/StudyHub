import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ColorPicker";
import { getRepos } from "@/data/db";
import type { Subject } from "@/data/types";
import { SUBJECT_COLORS } from "@/features/setup/types";
import { reportError } from "@/lib/logger";

export function SubjectDialog({ open, onOpenChange, subject, count }: { open: boolean; onOpenChange: (o: boolean) => void; subject: Subject | null; count: number }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(subject?.name ?? "");
    setColor(subject?.color ?? SUBJECT_COLORS[count % SUBJECT_COLORS.length]);
    setTeacher(subject?.teacher ?? "");
    setRoom(subject?.room ?? "");
  }, [open, subject, count]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const repos = getRepos();
      const data = { name: name.trim(), color, teacher: teacher.trim() || null, room: room.trim() || null };
      if (subject) await repos.subjects.update(subject.id, data);
      else await repos.subjects.insert({ ...data, sort_order: count });
      onOpenChange(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("subjects", "save failed", e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? t("subjects.edit") : t("subjects.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="subject-name">{t("subjects.name")}</Label>
              <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required data-testid="subject-dialog-name" />
            </div>
            <div className="pb-1.5">
              <ColorPicker value={color} onChange={setColor} label={name} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subject-teacher">{t("subjects.teacher")}</Label>
              <Input id="subject-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-room">{t("subjects.room")}</Label>
              <Input id="subject-room" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
