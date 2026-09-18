import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { StepShell, OptionCards } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Step12Ai() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  return (
    <StepShell title={t("setup.ai.title")} description={t("setup.ai.description")}>
      <OptionCards<"off" | "on">
        name={t("setup.ai.title")}
        value={draft.aiEnabled ? "on" : "off"}
        onChange={(v) => patch({ aiEnabled: v === "on" })}
        options={[
          { value: "off", label: t("setup.ai.off"), description: t("setup.ai.offHint") },
          { value: "on", label: t("setup.ai.on"), description: t("setup.ai.onHint") },
        ]}
      />
      {draft.aiEnabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">{t("setup.ai.keyLabel")}</Label>
            <Input id="apiKey" type="password" autoComplete="off" value={draft.aiApiKey} onChange={(e) => patch({ aiApiKey: e.target.value })} placeholder="sk-ant-…" />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{t("setup.ai.privacy")}</p>
          </div>
        </div>
      )}
    </StepShell>
  );
}
