import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StepShell, FieldRow } from "../StepShell";
import { useSetupStore } from "../setupStore";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestNotificationPermission } from "@/features/notifications/permission";

export function Step11Notifications() {
  const { t } = useTranslation();
  const draft = useSetupStore((s) => s.draft);
  const patch = useSetupStore((s) => s.patch);
  const [denied, setDenied] = useState(false);

  const toggle = async (enabled: boolean) => {
    if (!enabled) {
      patch({ notificationsEnabled: false });
      return;
    }
    // The OS permission prompt is only shown once the user opts in here.
    const granted = await requestNotificationPermission();
    setDenied(!granted);
    patch({ notificationsEnabled: granted });
  };

  return (
    <StepShell title={t("setup.notifications.title")} description={t("setup.notifications.description")}>
      <FieldRow label={t("setup.notifications.allow")} htmlFor="notif">
        <Switch id="notif" checked={draft.notificationsEnabled} onCheckedChange={(v) => void toggle(v)} />
      </FieldRow>
      {denied && <p className="text-sm text-destructive">{t("setup.notifications.denied")}</p>}
      {draft.notificationsEnabled && (
        <>
          <FieldRow label={t("setup.notifications.lead")} htmlFor="lead">
            <Select value={String(draft.notificationsLeadMinutes)} onValueChange={(v) => patch({ notificationsLeadMinutes: Number(v) })}>
              <SelectTrigger id="lead"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 30, 60, 120, 1440, 2880].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m < 60 ? t("setup.notifications.minutes", { n: m }) : m < 1440 ? t("setup.notifications.hours", { n: m / 60 }) : t("setup.notifications.days", { n: m / 1440 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("setup.notifications.daily")} htmlFor="daily">
            <Switch id="daily" checked={draft.dailyReminderEnabled} onCheckedChange={(v) => patch({ dailyReminderEnabled: v })} />
          </FieldRow>
          {draft.dailyReminderEnabled && (
            <FieldRow label={t("setup.notifications.dailyTime")} htmlFor="dailyTime">
              <Input id="dailyTime" type="time" value={draft.dailyReminderTime} onChange={(e) => patch({ dailyReminderTime: e.target.value })} />
            </FieldRow>
          )}
        </>
      )}
    </StepShell>
  );
}
