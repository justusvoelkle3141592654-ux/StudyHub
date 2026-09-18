import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, HardDrive, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { useSyncStore } from "@/sync/syncStore";
import { syncNow } from "@/sync/syncService";
import { formatDateTime } from "@/lib/dates";
import { useOnline } from "@/hooks/useOnline";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

/** Slim status line: storage mode, connectivity, version. */
export function StatusBar() {
  const { t } = useTranslation();
  const online = useOnline();
  const mode = useAppStore((s) => s.mode);
  const sync = useSyncStore();
  return (
    <footer
      className="flex h-6 shrink-0 items-center gap-3 border-t bg-muted/40 px-3 text-[11px] text-muted-foreground"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1">
        {mode === "cloud" ? <Cloud className="size-3" aria-hidden /> : <HardDrive className="size-3" aria-hidden />}
        {mode === "cloud" ? t("status.cloudMode") : t("status.localMode")}
      </span>
      {!online && (
        <span className={cn("inline-flex items-center gap-1 text-warning")} title={t("status.offlineHint")}>
          <WifiOff className="size-3" aria-hidden />
          {t("status.offline")}
        </span>
      )}
      {mode === "cloud" && (
        <button
          type="button"
          onClick={() => void syncNow("manual")}
          className="inline-flex items-center gap-1 rounded px-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={sync.lastSyncAt ? t("sync.lastSync", { time: formatDateTime(sync.lastSyncAt) }) : t("sync.now")}
          aria-label={t("sync.now")}
          data-testid="statusbar-sync"
        >
          {sync.status === "syncing" ? <RefreshCw className="size-3 animate-spin" aria-hidden /> : sync.status === "error" ? <TriangleAlert className="size-3 text-destructive" aria-hidden /> : sync.status === "offline" ? <CloudOff className="size-3" aria-hidden /> : <Cloud className="size-3" aria-hidden />}
          {t(`sync.status.${sync.status}`)}
          {sync.pendingCount > 0 && <span className="rounded bg-muted px-1">{sync.pendingCount}</span>}
        </button>
      )}
      <span className="ml-auto">
        {t("status.version")} {__APP_VERSION__}
      </span>
    </footer>
  );
}
