import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileEntry } from "@/data/types";
import { isTauri, getPlatform, isMobilePlatform } from "@/platform";
import { openExternally, readFileBytes } from "./fileService";

const TEXT_LIMIT = 1024 * 1024;

/** Inline preview for PDF, images and text; everything else offers "open externally". */
export function FilePreview({ file }: { file: FileEntry }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const mime = file.mime_type ?? "";
  const kind = mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : mime.startsWith("text/") || mime === "application/json" ? "text" : "other";

  useEffect(() => {
    void getPlatform().then((p) => setMobile(isMobilePlatform(p)));
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setText(null);
    setError(null);
    if (kind === "other") return;
    void readFileBytes(file)
      .then((bytes) => {
        if (cancelled || !bytes) return;
        if (kind === "text") {
          setText(new TextDecoder().decode(bytes.subarray(0, TEXT_LIMIT)) + (bytes.length > TEXT_LIMIT ? "\n…" : ""));
        } else {
          objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
          setUrl(objectUrl);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, kind, mime]);

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (kind === "image" && url) return <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />;
  if (kind === "pdf" && url && !mobile) return <iframe src={url} title={file.name} className="h-full w-full rounded-md border bg-white" />;
  if (kind === "text" && text !== null) return <pre className="h-full overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{text}</pre>;
  if (kind !== "other" && !url && text === null) return <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <FileQuestion className="size-10" aria-hidden />
      <p>{kind === "pdf" && mobile ? t("files.pdfMobileHint") : t("files.noPreview")}</p>
      {isTauri() && (
        <Button variant="outline" size="sm" onClick={() => void openExternally(file)}>
          <ExternalLink /> {t("files.openExternal")}
        </Button>
      )}
    </div>
  );
}
