import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudOff, CloudUpload, ExternalLink, FileText, FolderInput, Link2, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import type { FileEntry } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectSelect } from "@/features/subjects/SubjectSelect";
import { SubjectDot } from "@/features/subjects/SubjectBadge";
import { FolderTree, useFolders } from "@/components/folders/FolderTree";
import { formatDate } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { isTauri, getPlatform, isMobilePlatform } from "@/platform";
import { useAppStore } from "@/stores/appStore";
import { deleteFile, formatBytes, importBrowserFiles, importPaths, importViaDialog, openExternally } from "./fileService";
import { FilePreview } from "./FilePreview";
import { useFileDrop } from "./useFileDrop";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const NONE = "__none__";

export function FilesPage() {
  const { t } = useTranslation();
  const { subjects, get } = useSubjects();
  const { folders } = useFolders("files");
  const mode = useAppStore((s) => s.mode);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [toDelete, setToDelete] = useState<FileEntry | null>(null);
  const [mobile, setMobile] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void getPlatform().then((p) => setMobile(isMobilePlatform(p)));
  }, []);

  const { data: files } = useRepoQuery(() => getRepos().files.getAll(), ["files"]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (files ?? []).filter((f) => (q ? f.name.toLowerCase().includes(q) : f.folder_id === folderId) && (!subjectFilter || f.subject_id === subjectFilter));
  }, [files, folderId, subjectFilter, search]);

  useEffect(() => {
    if (selected && !(files ?? []).some((f) => f.id === selected.id)) setSelected(null);
    else if (selected) setSelected((files ?? []).find((f) => f.id === selected.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const target = useMemo(() => ({ folderId, subjectId: subjectFilter }), [folderId, subjectFilter]);
  const afterImport = (rows: FileEntry[]) => {
    if (rows.length) toast.success(t("files.imported", { count: rows.length }));
  };
  const handleError = (e: unknown) => toast.error(t("common.errorGeneric"), { description: reportError("files", "import failed", e) });

  const onPaths = useCallback(
    (paths: string[]) => {
      setImporting(true);
      importPaths(paths, target).then(afterImport, handleError).finally(() => setImporting(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  );
  const onFiles = useCallback(
    (dropped: File[]) => {
      setImporting(true);
      importBrowserFiles(dropped, target).then(afterImport, handleError).finally(() => setImporting(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  );
  const { dragging, browserHandlers } = useFileDrop(onPaths, onFiles);

  const pick = async () => {
    setImporting(true);
    try {
      afterImport(await importViaDialog(target));
    } catch (e) {
      handleError(e);
    } finally {
      setImporting(false);
    }
  };

  const update = async (file: FileEntry, patch: Partial<Pick<FileEntry, "subject_id" | "folder_id" | "upload_status">>) => {
    try {
      await getRepos().files.update(file.id, patch);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("files", "update failed", e) });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteFile(toDelete);
      if (selected?.id === toDelete.id) setSelected(null);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("files", "delete failed", e) });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 md:-m-6 md:h-[calc(100%+3rem)]" {...browserHandlers}>
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r p-3 lg:block" aria-label={t("folders.folder")}>
        <FolderTree kind="files" selected={folderId} onSelect={setFolderId} rootLabel={t("files.allFiles")} />
      </aside>
      <div className={cn("flex min-w-0 flex-1 flex-col", selected && "hidden md:flex")}>
        <div className="p-4 pb-0 md:p-6 md:pb-0">
          <PageHeader
            title={t("nav.files")}
            actions={
              <Button onClick={() => void pick()} disabled={importing} data-testid="file-import">
                <Upload /> {t("files.import")}
              </Button>
            }
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("files.searchPlaceholder")} className="pl-8" aria-label={t("common.search")} />
            </div>
            <div className="w-48">
              <SubjectSelect subjects={subjects} value={subjectFilter} onChange={setSubjectFilter} allLabel={t("tasks.filter.allSubjects")} />
            </div>
          </div>
          {mobile && <p className="mb-2 text-xs text-muted-foreground">{t("files.androidHint")}</p>}
        </div>
        <div className={cn("relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6", dragging && "ring-2 ring-inset ring-primary")}>
          {dragging && (
            <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">
              {t("files.dropHere")}
            </div>
          )}
          {list.length === 0 ? (
            <EmptyState icon={<FolderInput className="size-8" />} title={t("files.emptyTitle")} description={mobile ? t("files.emptyHintMobile") : t("files.emptyHint")} />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {list.map((f) => {
                const subject = get(f.subject_id);
                return (
                  <li key={f.id} className={cn("flex items-center gap-3 p-2 pl-3", selected?.id === f.id && "bg-accent")} data-testid="file-item">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSelected(f)} aria-current={selected?.id === f.id ? "true" : undefined}>
                      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{f.name}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatBytes(f.size_bytes)}</span>
                          <span>{formatDate(f.created_at)}</span>
                          {subject && (
                            <span className="inline-flex items-center gap-1">
                              <SubjectDot color={subject.color} />
                              {subject.name}
                            </span>
                          )}
                          {!!f.is_linked && <Link2 className="size-3" aria-label={t("files.linked")} />}
                          {mode === "cloud" && (f.upload_status === "uploaded" ? <CloudUpload className="size-3 text-success" aria-label={t("files.uploaded")} /> : f.upload_status === "pending" ? <CloudUpload className="size-3" aria-label={t("files.uploadPending")} /> : <CloudOff className="size-3" aria-label={t("files.notUploaded")} />)}
                        </span>
                      </span>
                    </button>
                    <Button variant="ghost" size="icon-sm" aria-label={`${t("common.delete")} ${f.name}`} onClick={() => setToDelete(f)}>
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {selected && (
        <section className="flex w-full min-w-0 flex-col border-l md:w-[45%]" aria-label={t("files.preview")}>
          <div className="flex items-center gap-2 border-b p-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{selected.name}</p>
            {isTauri() && (
              <Button variant="ghost" size="icon-sm" aria-label={t("files.openExternal")} onClick={() => void openExternally(selected)}>
                <ExternalLink />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label={t("common.close")} onClick={() => setSelected(null)}>
              <X />
            </Button>
          </div>
          <div className="grid gap-2 border-b p-2 text-xs sm:grid-cols-2">
            <SubjectSelect subjects={subjects} value={selected.subject_id} onChange={(id) => void update(selected, { subject_id: id })} />
            <Select value={selected.folder_id ?? NONE} onValueChange={(v) => void update(selected, { folder_id: v === NONE ? null : v })}>
              <SelectTrigger aria-label={t("folders.folder")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("files.noFolder")}</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground sm:col-span-2">
              {formatBytes(selected.size_bytes)} · {selected.mime_type ?? t("files.unknownType")}
              {selected.checksum_sha256 && <span className="block truncate font-mono">SHA-256 {selected.checksum_sha256}</span>}
              {selected.local_path && !selected.local_path.startsWith("idb://") && <span className="block truncate">{selected.local_path}</span>}
            </p>
            {mode === "cloud" && selected.upload_status !== "uploaded" && (
              <Button variant="outline" size="sm" className="sm:col-span-2" onClick={() => void update(selected, { upload_status: "pending" })} disabled={selected.upload_status === "pending"}>
                <CloudUpload /> {selected.upload_status === "pending" ? t("files.uploadPending") : t("files.uploadNow")}
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <FilePreview file={selected} />
          </div>
        </section>
      )}
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={t("common.confirmDelete")} description={t("files.deleteHint")} confirmLabel={t("common.delete")} destructive onConfirm={remove} />
    </div>
  );
}
