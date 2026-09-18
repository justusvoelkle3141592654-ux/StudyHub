import { useTranslation } from "react-i18next";
import { StepShell, FieldRow } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUiStore, type Density, type FontSize, type ThemeMode } from "@/stores/uiStore";

export function Step13Appearance() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const ui = useUiStore();
  return (
    <StepShell title={t("setup.appearance.title")} description={t("setup.appearance.description")}>
      <FieldRow label={t("settings.theme")} htmlFor="theme">
        <Select value={draft.theme} onValueChange={(v) => { patch({ theme: v as ThemeMode }); ui.setTheme(v as ThemeMode); }}>
          <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light">{t("theme.light")}</SelectItem>
            <SelectItem value="dark">{t("theme.dark")}</SelectItem>
            <SelectItem value="system">{t("theme.system")}</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label={t("settings.fontSize")} htmlFor="fontSize">
        <Select value={draft.fontSize} onValueChange={(v) => { patch({ fontSize: v as FontSize }); ui.setFontSize(v as FontSize); }}>
          <SelectTrigger id="fontSize"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="small">{t("settings.fontSmall")}</SelectItem>
            <SelectItem value="normal">{t("settings.fontNormal")}</SelectItem>
            <SelectItem value="large">{t("settings.fontLarge")}</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label={t("settings.density")} htmlFor="density">
        <Select value={draft.density} onValueChange={(v) => { patch({ density: v as Density }); ui.setDensity(v as Density); }}>
          <SelectTrigger id="density"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">{t("settings.densityComfortable")}</SelectItem>
            <SelectItem value="compact">{t("settings.densityCompact")}</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </StepShell>
  );
}
