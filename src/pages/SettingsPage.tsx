import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DatabaseBackup, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SETTINGS } from "@/app/settingsKeys";
import { useSetting, useSettingsStore } from "@/stores/settingsStore";
import { isTauri } from "@/platform";
import { createBackup, listBackups, type BackupInfo } from "@/features/backup/backupService";
import { formatBytes } from "@/features/files/fileService";
import { formatDate } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { CloudSettings } from "@/features/cloud/CloudSettings";
import { AiSettings } from "@/ai/AiSettings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUiStore, type Density, type FontSize, type Language, type ThemeMode } from "@/stores/uiStore";

function SettingRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="w-44">{children}</div>
    </div>
  );
}

function StorageSection() {
  const { t } = useTranslation();
  const setSetting = useSettingsStore((s) => s.set);
  const workingFolder = useSetting<string | null>(SETTINGS.workingFolder, null);
  const linkFiles = useSetting<boolean>(SETTINGS.linkFilesInsteadOfCopy, false);
  const lastBackup = useSetting<string | null>(SETTINGS.lastBackupDate, null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    if (isTauri()) void listBackups().then(setBackups).catch(() => setBackups([]));
  };
  useEffect(refresh, [lastBackup]);
  const backupNow = async () => {
    setBusy(true);
    try {
      const path = await createBackup();
      if (path) toast.success(t("settings.backupDone", { path }));
      refresh();
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("backup", "manual backup failed", e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t("settings.storage")}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="py-2">
          <p className="text-sm font-medium">{t("setup.workingFolder.title")}</p>
          <p className="break-all font-mono text-xs text-muted-foreground">{workingFolder ?? t("setup.summary.default")}</p>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <Label htmlFor="linkFilesSetting">{t("setup.workingFolder.linkInstead")}</Label>
          <Switch id="linkFilesSetting" checked={linkFiles} onCheckedChange={(v) => void setSetting(SETTINGS.linkFilesInsteadOfCopy, v)} />
        </div>
        <div className="py-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("settings.backups")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.backupsHint")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void backupNow()} disabled={busy || !isTauri()}>
              <DatabaseBackup /> {t("settings.backupNow")}
            </Button>
          </div>
          {backups.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
              {backups.map((b) => (
                <li key={b.path} className="flex justify-between gap-2 font-mono">
                  <span className="truncate">{b.name}</span>
                  <span>{formatBytes(b.size)}{b.modified_ms ? ` · ${formatDate(new Date(b.modified_ms))}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const ui = useUiStore();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("settings.title")}
        actions={
          <Button variant="outline" onClick={() => navigate("/setup")}>
            <Wand2 /> {t("settings.rerunWizard")}
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow label={t("settings.theme")} htmlFor="theme">
            <Select value={ui.theme} onValueChange={(v) => ui.setTheme(v as ThemeMode)}>
              <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("theme.light")}</SelectItem>
                <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                <SelectItem value="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t("settings.fontSize")} htmlFor="fontSize">
            <Select value={ui.fontSize} onValueChange={(v) => ui.setFontSize(v as FontSize)}>
              <SelectTrigger id="fontSize"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t("settings.fontSmall")}</SelectItem>
                <SelectItem value="normal">{t("settings.fontNormal")}</SelectItem>
                <SelectItem value="large">{t("settings.fontLarge")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t("settings.density")} htmlFor="density">
            <Select value={ui.density} onValueChange={(v) => ui.setDensity(v as Density)}>
              <SelectTrigger id="density"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">{t("settings.densityComfortable")}</SelectItem>
                <SelectItem value="compact">{t("settings.densityCompact")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t("settings.language")} htmlFor="language">
            <Select value={ui.language} onValueChange={(v) => ui.setLanguage(v as Language)}>
              <SelectTrigger id="language"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="de">{t("settings.german")}</SelectItem>
                <SelectItem value="en">{t("settings.english")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>
      <StorageSection />
      <CloudSettings />
      <AiSettings />
    </div>
  );
}
