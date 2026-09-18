import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { bootstrap } from "./bootstrap";
import { Button } from "@/components/ui/button";

/** Gate: loading screen → fatal error screen → app. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const ready = useAppStore((s) => s.ready);
  const error = useAppStore((s) => s.startupError);

  useEffect(() => {
    if (!ready && !error) void bootstrap();
  }, [ready, error]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center p-6" role="alert">
        <div className="max-w-md space-y-3 text-center">
          <TriangleAlert className="mx-auto size-10 text-destructive" aria-hidden />
          <h1 className="text-lg font-semibold">{t("startup.errorTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("startup.errorHint")}</p>
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs">{error}</pre>
          <Button onClick={() => window.location.reload()}>{t("startup.retry")}</Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center" aria-busy="true">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
