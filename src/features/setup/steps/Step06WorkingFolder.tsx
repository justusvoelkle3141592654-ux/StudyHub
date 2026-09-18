import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isTauri } from "@/platform";
import { pickDirectory } from "@/platform/files";
import { WORKING_SUBFOLDERS } from "../applySetup";

export function Step06WorkingFolder() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const [defaultPath, setDefaultPath] = useState("");

  useEffect(() => {
    if (!isTauri()) {
      setDefaultPath(t("setup.database.browserDefault"));
      return;
    }
    void (async () => {
      const { documentsDirectory, joinPath, appDataDirectory } = await import("@/platform/native");
      const docs = await documentsDirectory();
      setDefaultPath(await joinPath(docs ?? (await appDataDirectory()), "StudyHub"));
    })();
  }, [t]);

  const choose = async () => {
    const dir = await pickDirectory();
    if (dir) patch({ workingFolder: dir });
  };

  return (
    <StepShell title={t("setup.workingFolder.title")} description={t("setup.workingFolder.description")}>
      <div className="space-y-2 rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("setup.workingFolder.current")}</p>
        <p className="break-all font-mono text-sm" data-testid="working-folder">
          {draft.workingFolder ?? defaultPath}
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-muted-foreground sm:grid-cols-4">
          {WORKING_SUBFOLDERS.map((sub) => (
            <li key={sub} className="font-mono">
              {sub}/ <span className="font-sans text-xs">{t(`setup.workingFolder.sub.${sub}`)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button variant="outline" onClick={choose} disabled={!isTauri()}>
        <FolderOpen /> {t("setup.workingFolder.choose")}
      </Button>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <Label htmlFor="linkFiles" className="leading-snug">
          {t("setup.workingFolder.linkInstead")}
          <span className="block text-xs font-normal text-muted-foreground">{t("setup.workingFolder.linkInsteadHint")}</span>
        </Label>
        <Switch id="linkFiles" checked={draft.linkFilesInsteadOfCopy} onCheckedChange={(v) => patch({ linkFilesInsteadOfCopy: v })} />
      </div>
      {!isTauri() && <p className="text-xs text-muted-foreground">{t("setup.desktopOnlyHint")}</p>}
    </StepShell>
  );
}
