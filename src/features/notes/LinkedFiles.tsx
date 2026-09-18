import { useTranslation } from "react-i18next";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getRepos } from "@/data/db";
import { useRepoQuery } from "@/hooks/useRepoQuery";

/** Attach files from the files module to a note (note_files link table). */
export function LinkedFiles({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const { data: files } = useRepoQuery(() => getRepos().files.getAll(), ["files"]);
  const { data: links } = useRepoQuery(() => getRepos().noteFiles.getForNote(noteId), ["note_files"], [noteId]);
  const linked = new Set((links ?? []).map((l) => l.file_id));

  const toggle = async (fileId: string, on: boolean) => {
    const repos = getRepos();
    if (on) await repos.noteFiles.link(noteId, fileId);
    else await repos.noteFiles.unlink(noteId, fileId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t("notes.linkFiles")}>
          <Paperclip /> {linked.size > 0 ? linked.size : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="mb-2 px-1 text-xs font-medium">{t("notes.linkFiles")}</p>
        {(files ?? []).length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">{t("notes.noFilesToLink")}</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {(files ?? []).map((f) => (
              <li key={f.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={linked.has(f.id)} onCheckedChange={(v) => void toggle(f.id, v === true)} />
                  <span className="truncate">{f.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
