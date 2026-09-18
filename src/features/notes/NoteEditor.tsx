import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Columns2, Download, Eye, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { Folder, Note } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { formatDateTime } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "./MarkdownPreview";
import { TagInput } from "./TagInput";
import { exportNoteMarkdown, exportNotePdf } from "./exportNotes";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Mode = "edit" | "split" | "preview";
const NONE = "__none__";

/**
 * Markdown editor with live preview and debounced autosave. The note is
 * saved 600 ms after the last change and immediately on unmount.
 */
export function NoteEditor({ noteId, folders }: { noteId: string; folders: Folder[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subjects } = useSubjects();
  const { data: note, loading } = useRepoQuery(() => getRepos().notes.getById(noteId), [], [noteId]);
  const { data: tagRows } = useRepoQuery(() => getRepos().noteTags.getForNote(noteId), ["note_tags"], [noteId]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>(() => (typeof window !== "undefined" && window.innerWidth < 900 ? "edit" : "split"));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadedId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, content, tags });
  latest.current = { title, content, tags };

  useEffect(() => {
    if (note && loadedId.current !== note.id) {
      loadedId.current = note.id;
      setTitle(note.title);
      setContent(note.content_markdown);
      setDirty(false);
      setSavedAt(note.updated_at);
    }
  }, [note]);
  useEffect(() => {
    if (tagRows) setTags(tagRows.map((r) => r.tag));
  }, [tagRows]);

  const persist = useCallback(async () => {
    if (!loadedId.current) return;
    const { title: tt, content: cc, tags: tg } = latest.current;
    try {
      const repos = getRepos();
      const updated = await repos.notes.update(loadedId.current, { title: tt.trim() || t("notes.untitled"), content_markdown: cc });
      await repos.noteTags.setTags(loadedId.current, tg);
      setSavedAt(updated.updated_at);
      setDirty(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "autosave failed", e) });
    }
  }, [t]);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 600);
  }, [persist]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void persist();
      }
    },
    [persist],
  );

  const updateMeta = async (patch: Partial<Pick<Note, "subject_id" | "folder_id" | "is_pinned">>) => {
    try {
      await getRepos().notes.update(noteId, patch);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "update failed", e) });
    }
  };

  const remove = async () => {
    try {
      if (timer.current) clearTimeout(timer.current);
      loadedId.current = null;
      await getRepos().notes.softDelete(noteId);
      navigate("/notes");
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "delete failed", e) });
    }
  };

  const doExport = async (kind: "md" | "pdf") => {
    if (!note) return;
    try {
      await persist();
      const fresh = (await getRepos().notes.getById(noteId)) ?? note;
      const path = kind === "md" ? await exportNoteMarkdown(fresh) : await exportNotePdf(fresh);
      if (path) toast.success(t("notes.exported", { path }));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "export failed", e) });
    }
  };

  const folderOptions = useMemo(() => folders.map((f) => ({ id: f.id, name: f.name })), [folders]);

  if (loading && !note) return <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!note) return <p className="p-4 text-sm text-muted-foreground">{t("notes.notFound")}</p>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
          placeholder={t("notes.titlePlaceholder")}
          className="h-9 min-w-40 flex-1 border-0 bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
          aria-label={t("notes.titleLabel")}
          data-testid="note-title"
        />
        <div className="inline-flex rounded-md border" role="group" aria-label={t("notes.viewMode")}>
          {(["edit", "split", "preview"] as Mode[]).map((m) => (
            <Button key={m} variant={mode === m ? "secondary" : "ghost"} size="icon-sm" aria-label={t(`notes.mode.${m}`)} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "edit" ? <Pencil /> : m === "split" ? <Columns2 /> : <Eye />}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={note.is_pinned ? t("notes.unpin") : t("notes.pin")} aria-pressed={!!note.is_pinned} onClick={() => void updateMeta({ is_pinned: note.is_pinned ? 0 : 1 })}>
          {note.is_pinned ? <PinOff /> : <Pin />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("notes.export")}>
              <Download />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void doExport("md")}>Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void doExport("pdf")}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} onClick={() => setConfirmDelete(true)}>
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b px-2 py-1.5 text-xs">
        <div className="w-40">
          <SubjectSelect subjects={subjects} value={note.subject_id} onChange={(id) => void updateMeta({ subject_id: id })} />
        </div>
        <div className="w-40">
          <Select value={note.folder_id ?? NONE} onValueChange={(v) => void updateMeta({ folder_id: v === NONE ? null : v })}>
            <SelectTrigger aria-label={t("folders.folder")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("notes.noFolder")}</SelectItem>
              {folderOptions.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TagInput
          value={tags}
          onChange={(next) => {
            setTags(next);
            scheduleSave();
          }}
        />
        <span className="ml-auto text-muted-foreground" aria-live="polite">
          {dirty ? t("notes.saving") : savedAt ? t("notes.savedAt", { time: formatDateTime(savedAt) }) : ""}
        </span>
      </div>
      <div className={cn("grid min-h-0 flex-1", mode === "split" && "md:grid-cols-2")}>
        {mode !== "preview" && (
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave();
            }}
            className="h-full min-h-64 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
            placeholder={t("notes.contentPlaceholder")}
            aria-label={t("notes.contentLabel")}
            data-testid="note-content"
            spellCheck
          />
        )}
        {mode !== "edit" && (
          <div className={cn("min-h-0 overflow-y-auto p-4", mode === "split" && "border-l")} data-testid="note-preview">
            <MarkdownPreview markdown={content} />
          </div>
        )}
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t("common.confirmDelete")} description={t("notes.deleteHint")} confirmLabel={t("common.delete")} destructive onConfirm={remove} />
    </div>
  );
}
