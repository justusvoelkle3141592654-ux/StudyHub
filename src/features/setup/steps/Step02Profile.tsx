import { useTranslation } from "react-i18next";
import { StepShell, OptionCards } from "../StepShell";
import { useSetupStore } from "../setupStore";
import type { UsageProfile } from "@/stores/appStore";

export function Step02Profile() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  return (
    <StepShell title={t("setup.profile.title")} description={t("setup.profile.description")}>
      <OptionCards<UsageProfile>
        name={t("setup.profile.title")}
        columns={2}
        value={draft.profile}
        onChange={(profile) => patch({ profile })}
        options={[
          { value: "school", label: t("setup.profile.school"), description: t("setup.profile.schoolHint") },
          { value: "university", label: t("setup.profile.university"), description: t("setup.profile.universityHint") },
          { value: "work", label: t("setup.profile.work"), description: t("setup.profile.workHint") },
          { value: "mixed", label: t("setup.profile.mixed"), description: t("setup.profile.mixedHint") },
        ]}
      />
    </StepShell>
  );
}
