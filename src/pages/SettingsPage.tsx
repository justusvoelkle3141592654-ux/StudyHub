import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
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
    </div>
  );
}
