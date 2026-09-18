import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { StepShell, OptionCards } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { useUiStore, type Language } from "@/stores/uiStore";

export function Step01Welcome() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const setLanguage = useUiStore((s) => s.setLanguage);
  return (
    <StepShell title={t("setup.welcome.title")} description={t("setup.welcome.description")}>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
        <GraduationCap className="size-8 shrink-0 text-primary" aria-hidden />
        <p className="text-sm">{t("setup.welcome.features")}</p>
      </div>
      <OptionCards<Language>
        name={t("settings.language")}
        columns={2}
        value={draft.language}
        onChange={(language) => {
          patch({ language });
          setLanguage(language);
        }}
        options={[
          { value: "de", label: "Deutsch" },
          { value: "en", label: "English" },
        ]}
      />
    </StepShell>
  );
}
