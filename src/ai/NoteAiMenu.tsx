import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRepos } from "@/data/db";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useAiStore } from "./aiStore";
import { AiActionDialog } from "./AiActionDialog";
import { FlashcardsSchema, QuestionsSchema, generateStructured, streamText } from "./aiService";
import { flashcardsSystem, notePrompt, questionsSystem, summarizeSystem, type PromptLang } from "./prompts";
import { startingEase } from "@/features/flashcards/sm2";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";
import type { ReviewIntensity } from "@/features/setup/types";

type Action = "summarize" | "flashcards" | "questions";
const NEW_DECK = "__new__";

/** AI actions for a note. Rendered only when the AI feature is available. */
export function NoteAiMenu({ title, content, onInsert }: { title: string; content: string; onInsert: (markdown: string) => void }) {
  const { t, i18n } = useTranslation();
  const available = useAiStore((s) => s.available);
  const [action, setAction] = useState<Action | null>(null);
  const [deckId, setDeckId] = useState<string>(NEW_DECK);
  const { data: decks } = useRepoQuery(() => getRepos().decks.getAll(), ["flashcard_decks"]);
  const lang: PromptLang = i18n.language === "en" ? "en" : "de";
  if (!available) return null;

  const prompt = notePrompt(title, content);
  const titles: Record<Action, string> = { summarize: t("ai.summarize"), flashcards: t("ai.flashcards"), questions: t("ai.questions") };

  const run = (onDelta: (s: string) => void, signal: AbortSignal) => {
    if (action === "summarize") return streamText({ system: summarizeSystem(lang), prompt, onDelta, signal });
    if (action === "flashcards") return generateStructured(FlashcardsSchema, flashcardsSystem(lang, 15), prompt, signal);
    return generateStructured(QuestionsSchema, questionsSystem(lang, 8), prompt, signal);
  };

  const apply = async (result: unknown) => {
    if (action === "summarize") {
      onInsert(`\n\n## ${t("ai.summaryHeading")}\n\n${String(result)}\n`);
    } else if (action === "flashcards") {
      const { cards } = result as { cards: Array<{ front: string; back: string }> };
      const repos = getRepos();
      let target = deckId;
      if (target === NEW_DECK) target = (await repos.decks.insert({ name: title || t("notes.untitled") })).id;
      const intensity = getSetting<ReviewIntensity>(SETTINGS.flashcardsIntensity, "normal");
      for (const c of cards) await repos.flashcards.insert({ deck_id: target, front: c.front, back: c.back, ease_factor: startingEase(intensity) });
      toast.success(t("ai.cardsAdded", { count: cards.length }));
    } else {
      const { questions } = result as { questions: Array<{ question: string; answer: string }> };
      onInsert(`\n\n## ${t("ai.questionsHeading")}\n\n${questions.map((q, i) => `${i + 1}. **${q.question}**\n   ${q.answer}`).join("\n\n")}\n`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="note-ai">
            <Sparkles /> KI
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAction("summarize")}>{t("ai.summarize")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("flashcards")}>{t("ai.flashcards")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("questions")}>{t("ai.questions")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {action && (
        <AiActionDialog
          open={!!action}
          onOpenChange={(o) => !o && setAction(null)}
          title={titles[action]}
          contentToSend={prompt}
          run={run}
          onApply={apply}
          applyLabel={action === "flashcards" ? t("ai.addCards") : t("ai.insertIntoNote")}
          renderResult={(result) => {
            if (action === "flashcards") {
              const { cards } = result as { cards: Array<{ front: string; back: string }> };
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{t("ai.targetDeck")}</span>
                    <div className="w-56">
                      <Select value={deckId} onValueChange={setDeckId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NEW_DECK}>{t("ai.newDeck", { name: title })}</SelectItem>
                          {(decks ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ul className="divide-y text-sm">
                    {cards.map((c, i) => (
                      <li key={i} className="grid gap-1 py-2 sm:grid-cols-2">
                        <span className="font-medium">{c.front}</span>
                        <span className="text-muted-foreground">{c.back}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (action === "questions") {
              const { questions } = result as { questions: Array<{ question: string; answer: string }> };
              return (
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  {questions.map((q, i) => (
                    <li key={i}>
                      <span className="font-medium">{q.question}</span>
                      <span className="block text-muted-foreground">{q.answer}</span>
                    </li>
                  ))}
                </ol>
              );
            }
            return undefined;
          }}
        />
      )}
    </>
  );
}
