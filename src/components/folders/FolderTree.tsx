import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderPlus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRepos } from "@/data/db";
import type { Folder, FolderKind } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/logger";
import { PromptDialog } from "@/components/PromptDialog";

export function useFolders(kind: FolderKind) {
  const { data } = useRepoQuery(() => getRepos().folders.getByKind(kind), ["folders"], [kind]);
  const folders = useMemo(() => data ?? [], [data]);
  const children = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const f of folders) map.set(f.parent_id, [...(map.get(f.parent_id) ?? []), f]);
    return map;
  }, [folders]);
  return { folders, children, byId: useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]) };
}

/** Recursive folder tree with create / rename / delete. */
export function FolderTree({
  kind,
  selected,
  onSelect,
  rootLabel,
}: {
  kind: FolderKind;
  selected: string | null;
  onSelect: (folderId: string | null) => void;
  rootLabel: string;
}) {
  const { t } = useTranslation();
  const { children, byId } = useFolders(kind);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<{ mode: "create" | "rename"; parentId: string | null; folder?: Folder } | null>(null);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async (name: string) => {
    if (!prompt || !name.trim()) return;
    try {
      const repos = getRepos();
      if (prompt.mode === "create") {
        const f = await repos.folders.insert({ name: name.trim(), parent_id: prompt.parentId, kind });
        if (prompt.parentId) setExpanded((s) => new Set(s).add(prompt.parentId!));
        onSelect(f.id);
      } else if (prompt.folder) {
        await repos.folders.update(prompt.folder.id, { name: name.trim() });
      }
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("folders", "save failed", e) });
    } finally {
      setPrompt(null);
    }
  };

  const remove = async (folder: Folder) => {
    try {
      const repos = getRepos();
      // Move children up one level; contents of the folder lose their folder assignment.
      for (const child of children.get(folder.id) ?? []) await repos.folders.update(child.id, { parent_id: folder.parent_id });
      if (kind === "notes") for (const n of await repos.notes.getByFolder(folder.id)) await repos.notes.update(n.id, { folder_id: folder.parent_id });
      if (kind === "files") for (const f of await repos.files.getByFolder(folder.id)) await repos.files.update(f.id, { folder_id: folder.parent_id });
      if (kind === "documents") for (const d of (await repos.documents.getAll()).filter((d) => d.folder_id === folder.id)) await repos.documents.update(d.id, { folder_id: folder.parent_id });
      await repos.folders.softDelete(folder.id);
      if (selected === folder.id) onSelect(folder.parent_id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("folders", "delete failed", e) });
    }
  };

  const renderLevel = (parentId: string | null, depth: number) =>
    (children.get(parentId) ?? []).map((f) => {
      const hasChildren = (children.get(f.id) ?? []).length > 0;
      const open = expanded.has(f.id);
      return (
        <li key={f.id}>
          <div
            className={cn("group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-accent/60", selected === f.id && "bg-accent")}
            style={{ paddingLeft: depth * 12 }}
          >
            <button type="button" className="p-1 text-muted-foreground" aria-label={open ? t("folders.collapse") : t("folders.expand")} onClick={() => toggle(f.id)} tabIndex={hasChildren ? 0 : -1}>
              {hasChildren ? open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" /> : <span className="block size-3.5" />}
            </button>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left" onClick={() => onSelect(f.id)} aria-current={selected === f.id ? "true" : undefined}>
              <FolderIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{f.name}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100" aria-label={`${t("folders.actions")} ${f.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setPrompt({ mode: "create", parentId: f.id })}>{t("folders.newSub")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPrompt({ mode: "rename", parentId: f.parent_id, folder: f })}>{t("folders.rename")}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onSelect={() => void remove(f)}>
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {hasChildren && open && <ul>{renderLevel(f.id, depth + 1)}</ul>}
        </li>
      );
    });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn("flex-1 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-accent/60", selected === null && "bg-accent")}
          aria-current={selected === null ? "true" : undefined}
        >
          {rootLabel}
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={t("folders.new")} onClick={() => setPrompt({ mode: "create", parentId: null })}>
          <FolderPlus />
        </Button>
      </div>
      <ul>{renderLevel(null, 0)}</ul>
      <PromptDialog
        open={!!prompt}
        onOpenChange={(o) => !o && setPrompt(null)}
        title={prompt?.mode === "rename" ? t("folders.rename") : t("folders.new")}
        label={t("folders.name")}
        initialValue={prompt?.folder?.name ?? ""}
        onSubmit={submit}
      />
      <span hidden>{byId.size}</span>
    </div>
  );
}
