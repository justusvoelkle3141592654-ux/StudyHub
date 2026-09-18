import { useTranslation } from "react-i18next";

/** Sign-in / sign-up form for the cloud mode. Implemented in phase 9. */
export function CloudAccountPanel() {
  const { t } = useTranslation();
  return <p className="text-sm text-muted-foreground">{t("cloud.notYetAvailable")}</p>;
}
