import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";

export function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("app.tagline")} />
      <p className="text-sm text-muted-foreground">{t("dashboard.welcome")}</p>
    </div>
  );
}
