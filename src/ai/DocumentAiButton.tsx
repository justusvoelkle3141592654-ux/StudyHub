import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PromptDialog } from "@/components/PromptDialog";
import { useAiStore } from "./aiStore";
import { AiActionDialog } from "./AiActionDialog";
import { streamText } from "./aiService";
import { outlineSystem, topicPrompt, type PromptLang } from "./prompts";
import { markdownToHtml } from "./markdownToHtml";

/** "Suggest an outline / draft" for the office text editor. Hidden without AI. */
export function DocumentAiButton({ getContext, onInsertHtml }: { getContext: () => string; onInsertHtml: (html: string) => void }) {
  const { t, i18n } = useTranslation();
  const available = useAiStore((s) => s.available);
  const [mode, setMode] = useState<"outline" | "draft" | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const lang: PromptLang = i18n.language === "en" ? "en" : "de";
  if (!available) return null;
  const prompt = topic ? topicPrompt(topic, getContext().slice(0, 20000)) : "";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="doc-ai">
            <Sparkles /> KI
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setMode("outline")}>{t("ai.outline")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMode("draft")}>{t("ai.draft")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog open={!!mode && topic === null} onOpenChange={(o) => !o && setMode(null)} title={mode === "draft" ? t("ai.draft") : t("ai.outline")} label={t("ai.topic")} onSubmit={(v) => setTopic(v.trim())} />
      {mode && topic !== null && (
        <AiActionDialog
          open
          onOpenChange={(o) => {
            if (!o) {
              setMode(null);
              setTopic(null);
            }
          }}
          title={mode === "draft" ? t("ai.draft") : t("ai.outline")}
          contentToSend={prompt}
          run={(onDelta, signal) => streamText({ system: outlineSystem(lang, mode), prompt, onDelta, signal })}
          applyLabel={t("ai.insertIntoDocument")}
          onApply={(result) => onInsertHtml(markdownToHtml(String(result)))}
        />
      )}
    </>
  );
}
