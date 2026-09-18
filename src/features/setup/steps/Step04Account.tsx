import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { StepShell } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { CloudAccountPanel } from "@/features/cloud/CloudAccountPanel";

export function Step04Account() {
  const { t } = useTranslation();
  const mode = useSetupStore((s) => s.draft.mode);
  if (mode !== "cloud") {
    return (
      <StepShell title={t("setup.account.title")}>
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p>{t("setup.account.skippedOffline")}</p>
        </div>
      </StepShell>
    );
  }
  return (
    <StepShell title={t("setup.account.title")} description={t("setup.account.description")}>
      <CloudAccountPanel />
    </StepShell>
  );
}
