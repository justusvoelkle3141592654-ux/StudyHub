import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SETTINGS } from "@/app/settingsKeys";
import { useSetting, useSettingsStore } from "@/stores/settingsStore";
import { reportError } from "@/lib/logger";
import { AI_MODELS, DEFAULT_AI_MODEL, useAiStore } from "./aiStore";

export function AiSettings() {
  const { t } = useTranslation();
  const { hasKey, available, setKey, clearKey, refresh } = useAiStore();
  const enabled = useSetting<boolean>(SETTINGS.aiEnabled, false);
  const model = useSetting<string>(SETTINGS.aiModel, DEFAULT_AI_MODEL);
  const setSetting = useSettingsStore((s) => s.set);
  const [draft, setDraft] = useState("");

  const save = async () => {
    try {
      await setKey(draft);
      setDraft("");
      toast.success(t("ai.keySaved"));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("ai", "saving key failed", e) });
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" /> {t("setup.ai.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="aiEnabled" className="leading-snug">
            {t("ai.enable")}
            <span className="block text-xs font-normal text-muted-foreground">{available ? t("ai.statusOn") : hasKey ? t("ai.statusOff") : t("ai.statusNoKey")}</span>
          </Label>
          <Switch
            id="aiEnabled"
            checked={enabled && hasKey}
            disabled={!hasKey}
            onCheckedChange={async (v) => {
              await setSetting(SETTINGS.aiEnabled, v);
              await refresh();
            }}
            data-testid="ai-enable"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aiKey">{t("setup.ai.keyLabel")}</Label>
          <div className="flex gap-2">
            <Input id="aiKey" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hasKey ? "••••••••" : "sk-ant-…"} data-testid="ai-key" />
            <Button onClick={() => void save()} disabled={!draft.trim()} data-testid="ai-key-save">
              {t("common.save")}
            </Button>
            {hasKey && (
              <Button variant="outline" onClick={() => void clearKey()}>
                {t("ai.removeKey")}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aiModel">{t("ai.model")}</Label>
          <Select value={model} onValueChange={(v) => void setSetting(SETTINGS.aiModel, v)}>
            <SelectTrigger id="aiModel" className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t("setup.ai.privacy")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
