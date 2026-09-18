import { useTranslation } from "react-i18next";
import { StepShell, OptionCards, FieldRow } from "../StepShell";
import { useSetupStore } from "../setupStore";
import type { ReviewIntensity } from "../types";
import { Input } from "@/components/ui/input";

export function Step10Flashcards() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  return (
    <StepShell title={t("setup.flashcards.title")} description={t("setup.flashcards.description")}>
      <FieldRow label={t("setup.flashcards.dailyNew")} htmlFor="dailyNew" hint={t("setup.flashcards.dailyNewHint")}>
        <Input id="dailyNew" type="number" min={0} max={200} value={draft.flashcardsDailyNew} onChange={(e) => patch({ flashcardsDailyNew: Math.max(0, Number(e.target.value) || 0) })} />
      </FieldRow>
      <p className="text-sm font-medium">{t("setup.flashcards.intensity")}</p>
      <OptionCards<ReviewIntensity>
        name={t("setup.flashcards.intensity")}
        value={draft.flashcardsIntensity}
        onChange={(flashcardsIntensity) => patch({ flashcardsIntensity })}
        options={[
          { value: "relaxed", label: t("setup.flashcards.relaxed"), description: t("setup.flashcards.relaxedHint") },
          { value: "normal", label: t("setup.flashcards.normal"), description: t("setup.flashcards.normalHint") },
          { value: "intensive", label: t("setup.flashcards.intensive"), description: t("setup.flashcards.intensiveHint") },
        ]}
      />
    </StepShell>
  );
}
