import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Pin, Plus, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRepos } from "@/data/db";
import type { Note } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectDot } from "@/features/subjects/SubjectBadge";
import { FolderTree, useFolders } from "@/components/folders/FolderTree";
import { formatDate } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { NoteEditor } from "./NoteEditor";
import { exportFolderMarkdown, exportFolderPdf } from "./exportNotes";
import { EmptyState } from "@/components/EmptyState";

/**
 * Notes module: folder tree + tags + search on the left, note list in the
 * middle, editor on the right (`/notes/:id`). On small screens the list and
 * the editor replace each other.
 */
export function NotesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const { get } = useSubjects();
  const { folders, byId: folderById } = useFolders("notes");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(h);
  }, [search]);

  const { data: allNotes } = useRepoQuery(() => getRepos().notes.getAll(), ["notes"]);
  const { data: searchHits } = useRepoQuery(() => (debounced ? getRepos().notes.search(debounced) : Promise.resolve(null)), ["notes"], [debounced]);
  const { data: tags } = useRepoQuery(() => getRepos().noteTags.getAllTags(), ["note_tags"]);
  const { data: taggedIds } = useRepoQuery(() => (tag ? getRepos().noteTags.getNoteIdsWithTag(tag) : Promise.resolve(null)), ["note_tags"], [tag]);

  const notes = useMemo(() => {
    let list: Note[] = debounced ? (searchHits ?? []) : (allNotes ?? []);
    if (!debounced && folderId !== null) list = list.filter((n) => n.folder_id === folderId);
    if (tag && taggedIds) {
      const set = new Set(taggedIds);
      list = list.filter((n) => set.has(n.id));
    }
    return list;
  }, [allNotes, searchHits, debounced, folderId, tag, taggedIds]);

  const createNote = async () => {
    try {
      const n = await getRepos().notes.insert({ title: t("notes.untitled"), folder_id: folderId });
      if (tag) await getRepos().noteTags.setTags(n.id, [tag]);
      navigate(`/notes/${n.id}`);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "create failed", e) });
    }
  };

  const exportFolder = async (kind: "md" | "pdf") => {
    const name = folderId ? (folderById.get(folderId)?.name ?? t("nav.notes")) : t("notes.allNotes");
    const list = (allNotes ?? []).filter((n) => (folderId === null ? true : n.folder_id === folderId));
    if (!list.length) {
      toast.info(t("common.noData"));
      return;
    }
    try {
      const path = kind === "md" ? await exportFolderMarkdown(name, list) : await exportFolderPdf(name, list);
      if (path) toast.success(t("notes.exported", { path }));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("notes", "folder export failed", e) });
    }
  };

  const sidebar = (
    <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r p-3" aria-label={t("notes.sidebar")}>
      <FolderTree kind="notes" selected={folderId} onSelect={setFolderId} rootLabel={t("notes.allNotes")} />
      {(tags ?? []).length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Tag className="size-3" aria-hidden /> {t("notes.tags")}
          </p>
          <ul className="flex flex-wrap gap-1 px-1">
            {(tags ?? []).map((x) => (
              <li key={x}>
                <button
                  type="button"
                  onClick={() => setTag(tag === x ? null : x)}
                  aria-pressed={tag === x}
                  className={cn("rounded px-1.5 py-0.5 text-xs hover:bg-accent", tag === x ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-secondary")}
                >
                  #{x}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );

  const list = (
    <section className={cn("flex w-full flex-col md:w-72 md:shrink-0 md:border-r", activeId && "hidden md:flex")} aria-label={t("nav.notes")}>
      <div className="flex items-center gap-1 border-b p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("notes.searchPlaceholder")} className="pl-8" aria-label={t("common.search")} data-testid="note-search" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("notes.exportFolder")}>
              <Download />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void exportFolder("md")}>{t("notes.exportFolderMd")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportFolder("pdf")}>{t("notes.exportFolderPdf")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="icon" aria-label={t("notes.new")} onClick={() => void createNote()} data-testid="note-add">
          <Plus />
        </Button>
      </div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {notes.length === 0 && <li className="p-4 text-sm text-muted-foreground">{debounced ? t("notes.noHits") : t("common.noData")}</li>}
        {notes.map((n) => {
          const subject = get(n.subject_id);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => navigate(`/notes/${n.id}`)}
                aria-current={activeId === n.id ? "page" : undefined}
                className={cn("flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent/60", activeId === n.id && "bg-accent")}
                data-testid="note-item"
              >
                <span className="flex items-center gap-1.5">
                  {!!n.is_pinned && <Pin className="size-3 text-primary" aria-label={t("notes.pinned")} />}
                  <span className="truncate text-sm font-medium">{n.title}</span>
                </span>
                <span className="truncate text-xs text-muted-foreground">{n.content_markdown.replace(/[#*_`>\-]/g, "").slice(0, 80) || "…"}</span>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {subject && (
                    <span className="inline-flex items-center gap-1">
                      <SubjectDot color={subject.color} />
                      {subject.name}
                    </span>
                  )}
                  <span>{formatDate(n.updated_at)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 md:-m-6 md:h-[calc(100%+3rem)]">
      <div className="hidden lg:flex">{sidebar}</div>
      {list}
      <section className={cn("min-w-0 flex-1", !activeId && "hidden md:block")} aria-label={t("notes.editor")}>
        {activeId ? (
          <div className="flex h-full flex-col">
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>
                <ArrowLeft /> {t("common.back")}
              </Button>
            </div>
            <NoteEditor key={activeId} noteId={activeId} folders={folders} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title={t("notes.pickTitle")}
              description={t("notes.pickHint")}
              action={
                <Button onClick={() => void createNote()}>
                  <Plus /> {t("notes.new")}
                </Button>
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}
