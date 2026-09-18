import { useTranslation } from "react-i18next";
import { StepShell, OptionCards, FieldRow } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Switch } from "@/components/ui/switch";
import type { GradeScale } from "@/data/types";

export function Step09Grades() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  return (
    <StepShell title={t("setup.grades.title")} description={t("setup.grades.description")}>
      <OptionCards<GradeScale | "none">
        name={t("setup.grades.title")}
        columns={2}
        value={draft.gradeScale}
        onChange={(gradeScale) => patch({ gradeScale })}
        options={[
          { value: "de_1_6", label: t("grades.scale.de_1_6"), description: t("setup.grades.de16Hint") },
          { value: "points_0_15", label: t("grades.scale.points_0_15"), description: t("setup.grades.pointsHint") },
          { value: "percent", label: t("grades.scale.percent"), description: t("setup.grades.percentHint") },
          { value: "none", label: t("setup.grades.none"), description: t("setup.grades.noneHint") },
        ]}
      />
      {draft.gradeScale !== "none" && (
        <FieldRow label={t("setup.grades.weighted")} htmlFor="weighted" hint={t("setup.grades.weightedHint")}>
          <Switch id="weighted" checked={draft.gradesWeighted} onCheckedChange={(v) => patch({ gradesWeighted: v })} />
        </FieldRow>
      )}
    </StepShell>
  );
}
