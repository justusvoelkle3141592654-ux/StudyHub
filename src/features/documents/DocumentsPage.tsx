import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Pencil, Plus, Presentation as PresentationIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { DocType, Document as DocRow } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { FolderTree, useFolders } from "@/components/folders/FolderTree";
import { formatDateTime } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { PromptDialog } from "@/components/PromptDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_DOC } from "./text/docModel";
import { emptyPresentation } from "./presentation/model";
import { TextEditor } from "./text/TextEditor";
import { PresentationEditor } from "./presentation/PresentationEditor";

const NONE = "__none__";

/** List of office documents with folder tree, create / rename / delete. */
export function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { folders } = useFolders("documents");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [rename, setRename] = useState<DocRow | null>(null);
  const [toDelete, setToDelete] = useState<DocRow | null>(null);
  const [search, setSearch] = useState("");
  const { data } = useRepoQuery(() => getRepos().documents.getAll(), ["documents"]);
  const docs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => (q ? d.title.toLowerCase().includes(q) : d.folder_id === folderId));
  }, [data, folderId, search]);

  const create = async (docType: DocType) => {
    try {
      const labels = { title: t("documents.ph.title"), subtitle: t("documents.ph.subtitle"), content: t("documents.ph.content"), left: t("documents.ph.left"), right: t("documents.ph.right"), image: t("documents.ph.image") };
      const row = await getRepos().documents.insert({
        title: docType === "text" ? t("documents.untitledText") : t("documents.untitledPresentation"),
        doc_type: docType,
        content_json: JSON.stringify(docType === "text" ? EMPTY_DOC : emptyPresentation(labels)),
        folder_id: folderId,
      });
      navigate(`/documents/${row.id}`);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "create failed", e) });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await getRepos().documents.softDelete(toDelete.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "delete failed", e) });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 md:-m-6 md:h-[calc(100%+3rem)]">
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r p-3 lg:block" aria-label={t("folders.folder")}>
        <FolderTree kind="documents" selected={folderId} onSelect={setFolderId} rootLabel={t("documents.all")} />
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
        <PageHeader
          title={t("nav.documents")}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="doc-new">
                  <Plus /> {t("documents.new")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void create("text")} data-testid="doc-new-text">
                  <FileText /> {t("documents.typeText")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void create("presentation")} data-testid="doc-new-presentation">
                  <PresentationIcon /> {t("documents.typePresentation")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="mb-3 max-w-xs" aria-label={t("common.search")} />
        {docs.length === 0 ? (
          <EmptyState icon={<FileText className="size-8" />} title={t("documents.emptyTitle")} description={t("documents.emptyHint")} />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-2 pl-3" data-testid="doc-item">
                {d.doc_type === "text" ? <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden /> : <PresentationIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                <Link to={`/documents/${d.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium hover:underline">{d.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`documents.type.${d.doc_type}`)} · {formatDateTime(d.updated_at)}
                  </span>
                </Link>
                <Button variant="ghost" size="icon-sm" aria-label={`${t("folders.rename")} ${d.title}`} onClick={() => setRename(d)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${d.title}`} onClick={() => setToDelete(d)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PromptDialog open={!!rename} onOpenChange={(o) => !o && setRename(null)} title={t("folders.rename")} label={t("documents.titleLabel")} initialValue={rename?.title ?? ""} onSubmit={async (v) => { if (rename) await getRepos().documents.update(rename.id, { title: v.trim() }); setRename(null); }} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={t("common.confirmDelete")} description={t("documents.deleteHint")} confirmLabel={t("common.delete")} destructive onConfirm={remove} />
      <span hidden>{folders.length}</span>
    </div>
  );
}

/** Editor page: dispatches to the text or presentation editor. */
export function DocumentPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const { folders } = useFolders("documents");
  const { data: row, loading } = useRepoQuery(() => getRepos().documents.getById(id), [], [id]);
  const [title, setTitle] = useState<string | null>(null);

  if (loading && !row) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!row) return <p className="text-sm text-muted-foreground">{t("notes.notFound")}</p>;

  const saveTitle = async (v: string) => {
    if (v.trim() && v.trim() !== row.title) await getRepos().documents.update(row.id, { title: v.trim() });
  };

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 flex-col md:-m-6 md:h-[calc(100%+3rem)]">
      <div className="flex items-center gap-2 border-b px-2 py-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents">
            <ArrowLeft /> {t("nav.documents")}
          </Link>
        </Button>
        <Input
          value={title ?? row.title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title !== null) void saveTitle(title);
            setTitle(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={cn("h-8 max-w-md border-0 bg-transparent font-semibold shadow-none focus-visible:ring-0")}
          aria-label={t("documents.titleLabel")}
          data-testid="doc-title"
        />
        <div className="w-40">
          <Select value={row.folder_id ?? NONE} onValueChange={(v) => void getRepos().documents.update(row.id, { folder_id: v === NONE ? null : v })}>
            <SelectTrigger aria-label={t("folders.folder")} className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("notes.noFolder")}</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="min-h-0 flex-1">{row.doc_type === "text" ? <TextEditor key={row.id} row={row} /> : <PresentationEditor key={row.id} row={row} />}</div>
    </div>
  );
}
