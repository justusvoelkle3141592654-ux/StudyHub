import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, RotateCcw } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Button } from "@/components/ui/button";
import { isTauri } from "@/platform";
import { pickDirectory } from "@/platform/files";
import { DB_FILE_NAME, resolveDatabasePath } from "@/data/db";

export function Step05Database() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const [defaultPath, setDefaultPath] = useState<string>("");

  useEffect(() => {
    if (isTauri()) void resolveDatabasePath().then(setDefaultPath);
    else setDefaultPath(t("setup.database.browserDefault"));
  }, [t]);

  const choose = async () => {
    const dir = await pickDirectory();
    if (!dir) return;
    const { joinPath } = await import("@/platform/native");
    patch({ dbPath: await joinPath(dir, DB_FILE_NAME) });
  };

  return (
    <StepShell title={t("setup.database.title")} description={t("setup.database.description")}>
      <div className="space-y-2 rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("setup.database.current")}</p>
        <p className="break-all font-mono text-sm" data-testid="db-path">
          {draft.dbPath ?? defaultPath}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={choose} disabled={!isTauri()}>
          <FolderOpen /> {t("setup.database.choose")}
        </Button>
        {draft.dbPath && (
          <Button variant="ghost" onClick={() => patch({ dbPath: null })}>
            <RotateCcw /> {t("setup.database.useDefault")}
          </Button>
        )}
      </div>
      {!isTauri() && <p className="text-xs text-muted-foreground">{t("setup.desktopOnlyHint")}</p>}
      <p className="text-xs text-muted-foreground">{t("setup.database.networkHint")}</p>
    </StepShell>
  );
}
