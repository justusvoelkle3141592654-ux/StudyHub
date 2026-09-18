import { useTranslation } from "react-i18next";
import { Cloud, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getRepos } from "@/data/db";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { formatDateTime } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { useAppStore } from "@/stores/appStore";
import { SETTINGS } from "@/app/settingsKeys";
import { useSetting, useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/sync/auth";
import { useSyncStore } from "@/sync/syncStore";
import { disableCloudMode, enableCloudMode, syncNow } from "@/sync/syncService";
import { CloudAccountPanel } from "./CloudAccountPanel";
import { isCloudAvailable } from "./availability";

/** Settings section: storage mode switch, account, sync status and failed queue entries. */
export function CloudSettings() {
  const { t } = useTranslation();
  const mode = useAppStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const sync = useSyncStore();
  const autoUpload = useSetting<boolean>(SETTINGS.autoUpload, true);
  const setSetting = useSettingsStore((s) => s.set);
  const { data: failed } = useRepoQuery(() => getRepos().syncQueue.getFailed(), ["sync_queue"]);

  const toggleMode = async (cloud: boolean) => {
    try {
      if (cloud) await enableCloudMode();
      else await disableCloudMode();
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("sync", "mode switch failed", e) });
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="size-4" /> {t("cloud.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCloudAvailable() ? (
          <p className="text-sm text-muted-foreground">{t("cloud.notConfigured")}</p>
        ) : (
          <>
            <CloudAccountPanel onSignedOut={() => mode === "cloud" && void disableCloudMode()} />
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cloudMode" className="leading-snug">
                {t("setup.mode.cloud")}
                <span className="block text-xs font-normal text-muted-foreground">{mode === "cloud" ? t("cloud.modeOnHint") : t("cloud.modeOffHint")}</span>
              </Label>
              <Switch id="cloudMode" checked={mode === "cloud"} disabled={!userId && mode !== "cloud"} onCheckedChange={(v) => void toggleMode(v)} data-testid="cloud-mode-switch" />
            </div>
            {mode === "cloud" && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="autoUpload" className="leading-snug">
                    {t("cloud.autoUpload")}
                    <span className="block text-xs font-normal text-muted-foreground">{t("cloud.autoUploadHint")}</span>
                  </Label>
                  <Switch id="autoUpload" checked={autoUpload} onCheckedChange={(v) => void setSetting(SETTINGS.autoUpload, v)} />
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{t(`sync.status.${sync.status}`)}</span>
                    {sync.lastSyncAt && <span className="text-muted-foreground">{t("sync.lastSync", { time: formatDateTime(sync.lastSyncAt) })}</span>}
                    <span className="text-muted-foreground">{t("sync.pending", { count: sync.pendingCount })}</span>
                    {sync.uploadProgress && <span className="text-muted-foreground">{t("sync.uploading", { done: sync.uploadProgress.done, total: sync.uploadProgress.total })}</span>}
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => void syncNow("manual")} disabled={sync.status === "syncing"} data-testid="sync-now">
                      <RefreshCw className={sync.status === "syncing" ? "animate-spin" : ""} /> {t("sync.now")}
                    </Button>
                  </div>
                  {sync.lastError && <p className="mt-2 text-destructive">{sync.lastError}</p>}
                </div>
                {(failed ?? []).length > 0 && (
                  <div className="rounded-lg border border-destructive/40 p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-destructive">{t("sync.failedEntries", { count: failed!.length })}</p>
                      <Button size="sm" variant="ghost" onClick={() => void getRepos().syncQueue.clearFailed()}>
                        <Trash2 /> {t("sync.discardFailed")}
                      </Button>
                    </div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                      {failed!.map((f) => (
                        <li key={f.id} className="flex items-center gap-2">
                          <span className="truncate">
                            {t(`sync.tables.${f.entity_table}`, { defaultValue: f.entity_table })} · {f.operation} · {f.last_error}
                          </span>
                          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={t("sync.retry")} onClick={() => void getRepos().syncQueue.retry(f.id).then(() => syncNow("manual"))}>
                            <RotateCcw />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
