import { useTranslation } from "react-i18next";
import { Cloud, HardDrive, WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

/** Slim status line: storage mode, connectivity, version. */
export function StatusBar() {
  const { t } = useTranslation();
  const online = useOnline();
  const mode = useAppStore((s) => s.mode);
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
      <span className="ml-auto">
        {t("status.version")} {__APP_VERSION__}
      </span>
    </footer>
  );
}
