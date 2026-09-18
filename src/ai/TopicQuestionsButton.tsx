import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/PromptDialog";
import { getRepos } from "@/data/db";
import { useAiStore } from "./aiStore";
import { AiActionDialog } from "./AiActionDialog";
import { QuestionsSchema, generateStructured } from "./aiService";
import { questionsSystem, topicPrompt, type PromptLang } from "./prompts";
import { startingEase } from "@/features/flashcards/sm2";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";
import type { ReviewIntensity } from "@/features/setup/types";

/** Practice questions on a free topic, added to a deck as cards. Hidden without AI. */
export function TopicQuestionsButton({ deckId }: { deckId: string }) {
  const { t, i18n } = useTranslation();
  const available = useAiStore((s) => s.available);
  const [askTopic, setAskTopic] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const lang: PromptLang = i18n.language === "en" ? "en" : "de";
  if (!available) return null;
  const prompt = topic ? topicPrompt(topic) : "";
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAskTopic(true)} data-testid="deck-ai">
        <Sparkles /> {t("ai.questionsTopic")}
      </Button>
      <PromptDialog open={askTopic} onOpenChange={setAskTopic} title={t("ai.questionsTopic")} label={t("ai.topic")} onSubmit={(v) => { setTopic(v.trim()); setAskTopic(false); }} />
      {topic !== null && (
        <AiActionDialog
          open
          onOpenChange={(o) => !o && setTopic(null)}
          title={t("ai.questionsTopic")}
          contentToSend={prompt}
          run={(_onDelta, signal) => generateStructured(QuestionsSchema, questionsSystem(lang, 10), prompt, signal)}
          applyLabel={t("ai.addCards")}
          renderResult={(result) => (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {(result as { questions: Array<{ question: string; answer: string }> }).questions.map((q, i) => (
                <li key={i}>
                  <span className="font-medium">{q.question}</span>
                  <span className="block text-muted-foreground">{q.answer}</span>
                </li>
              ))}
            </ol>
          )}
          onApply={async (result) => {
            const { questions } = result as { questions: Array<{ question: string; answer: string }> };
            const intensity = getSetting<ReviewIntensity>(SETTINGS.flashcardsIntensity, "normal");
            for (const q of questions) await getRepos().flashcards.insert({ deck_id: deckId, front: q.question, back: q.answer, ease_factor: startingEase(intensity) });
            toast.success(t("ai.cardsAdded", { count: questions.length }));
          }}
        />
      )}
    </>
  );
}
