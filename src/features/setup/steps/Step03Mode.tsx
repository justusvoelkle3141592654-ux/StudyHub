import { useTranslation } from "react-i18next";
import { StepShell, OptionCards } from "../StepShell";
import { useSetupStore } from "../setupStore";
import type { StorageMode } from "@/stores/appStore";
import { isCloudAvailable } from "@/features/cloud/availability";

export function Step03Mode() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const cloud = isCloudAvailable();
  return (
    <StepShell title={t("setup.mode.title")} description={t("setup.mode.description")}>
      <OptionCards<StorageMode>
        name={t("setup.mode.title")}
        value={draft.mode}
        onChange={(mode) => patch({ mode })}
        options={[
          { value: "local", label: t("setup.mode.local"), description: t("setup.mode.localHint") },
          {
            value: "cloud",
            label: t("setup.mode.cloud"),
            description: cloud ? t("setup.mode.cloudHint") : t("setup.mode.cloudUnavailable"),
            disabled: !cloud,
          },
        ]}
      />
    </StepShell>
  );
}
