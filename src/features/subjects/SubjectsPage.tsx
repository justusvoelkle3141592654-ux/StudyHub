import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { getRepos } from "@/data/db";
import type { Subject } from "@/data/types";
import { reportError } from "@/lib/logger";
import { SubjectDot } from "./SubjectBadge";
import { SubjectDialog } from "./SubjectDialog";
import { useSubjects } from "./useSubjects";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

export function SubjectsPage() {
  const { t } = useTranslation();
  const { subjects } = useSubjects();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  const remove = async () => {
    if (!toDelete) return;
    try {
      await getRepos().subjects.softDelete(toDelete.id);
      toast.success(t("subjects.deleted", { name: toDelete.name }));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("subjects", "delete failed", e) });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("subjects.title")}
        description={t("subjects.description")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            data-testid="subject-add"
          >
            <Plus /> {t("subjects.new")}
          </Button>
        }
      />
      {subjects.length === 0 ? (
        <EmptyState title={t("subjects.emptyTitle")} description={t("subjects.emptyHint")} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <SubjectDot color={s.color} className="size-3.5" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[s.teacher, s.room].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${t("common.edit")} ${s.name}`}
                onClick={() => {
                  setEditing(s);
                  setOpen(true);
                }}
              >
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${s.name}`} onClick={() => setToDelete(s)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <SubjectDialog open={open} onOpenChange={setOpen} subject={editing} count={subjects.length} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("common.confirmDelete")}
        description={t("subjects.deleteHint")}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
