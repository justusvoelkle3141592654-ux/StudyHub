import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitConverter } from "./UnitConverter";
import { FormulaCollection } from "./FormulaCollection";
import { Calculator } from "./Calculator";
import { PeriodicTable } from "./PeriodicTable";

const TOOLS = ["units", "formulas", "calculator", "elements"] as const;
type Tool = (typeof TOOLS)[number];

export function ToolsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tool } = useParams();
  const active: Tool = TOOLS.includes(tool as Tool) ? (tool as Tool) : "units";
  return (
    <div>
      <PageHeader title={t("nav.tools")} />
      <Tabs value={active} onValueChange={(v) => navigate(`/tools/${v}`)} className="mb-4">
        <TabsList className="flex-wrap">
          {TOOLS.map((id) => (
            <TabsTrigger key={id} value={id} data-testid={`tool-${id}`}>
              {t(`tools.${id === "elements" ? "elements" : id === "calculator" ? "calc" : id}.title`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {active === "units" && <UnitConverter />}
      {active === "formulas" && <FormulaCollection />}
      {active === "calculator" && <Calculator />}
      {active === "elements" && <PeriodicTable />}
    </div>
  );
}
