import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRepos } from "@/data/db";
import type { Flashcard } from "@/data/types";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import { useSubjects } from "@/features/subjects/useSubjects";
import { SubjectBadge } from "@/features/subjects/SubjectBadge";
import { MarkdownPreview } from "@/features/notes/MarkdownPreview";
import { formatDate, todayKey } from "@/lib/dates";
import { reportError } from "@/lib/logger";
import { CardDialog } from "./CardDialog";
import { DeckDialog } from "./FlashcardsPage";
import { StatsChart } from "./StatsChart";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { TopicQuestionsButton } from "@/ai/TopicQuestionsButton";

export function DeckPage() {
  const { t } = useTranslation();
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const { get } = useSubjects();
  const [cardDialog, setCardDialog] = useState<{ open: boolean; card: Flashcard | null }>({ open: false, card: null });
  const [deckDialog, setDeckDialog] = useState(false);
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false);
  const [filter, setFilter] = useState("");

  const { data: deck } = useRepoQuery(() => getRepos().decks.getById(deckId), ["flashcard_decks"], [deckId]);
  const { data: cards } = useRepoQuery(() => getRepos().flashcards.getByDeck(deckId), ["flashcards"], [deckId]);
  const { data: stats } = useRepoQuery(() => getRepos().reviews.dailyStats(14, deckId), ["flashcard_reviews"], [deckId]);
  const today = todayKey();
  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (cards ?? []).filter((c) => !f || c.front.toLowerCase().includes(f) || c.back.toLowerCase().includes(f));
  }, [cards, filter]);
  const dueCount = (cards ?? []).filter((c) => c.due_date === null || c.due_date <= today).length;

  const removeCard = async (card: Flashcard) => {
    try {
      await getRepos().flashcards.softDelete(card.id);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "delete card failed", e) });
    }
  };
  const removeDeck = async () => {
    try {
      const repos = getRepos();
      for (const c of cards ?? []) await repos.flashcards.softDelete(c.id);
      await repos.decks.softDelete(deckId);
      navigate("/flashcards");
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "delete deck failed", e) });
    }
  };

  if (!deck) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link to="/flashcards">
          <ArrowLeft /> {t("nav.flashcards")}
        </Link>
      </Button>
      <PageHeader
        title={deck.name}
        description={deck.description ?? undefined}
        actions={
          <>
            <Button variant="outline" size="icon" aria-label={t("flashcards.editDeck")} onClick={() => setDeckDialog(true)}>
              <Pencil />
            </Button>
            <Button variant="outline" size="icon" aria-label={t("flashcards.deleteDeck")} onClick={() => setConfirmDeleteDeck(true)}>
              <Trash2 />
            </Button>
            <TopicQuestionsButton deckId={deckId} />
            <Button variant="secondary" asChild>
              <Link to={`/flashcards/${deckId}/study`} data-testid="deck-study">
                <Play /> {t("flashcards.study")} ({dueCount})
              </Link>
            </Button>
            <Button onClick={() => setCardDialog({ open: true, card: null })} data-testid="card-add">
              <Plus /> {t("flashcards.newCard")}
            </Button>
          </>
        }
      />
      <div className="mb-3 flex items-center gap-3">
        <SubjectBadge subject={get(deck.subject_id)} />
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("common.search")} className="max-w-xs" aria-label={t("common.search")} />
        <span className="text-sm text-muted-foreground">{t("flashcards.cardCount", { count: (cards ?? []).length })}</span>
      </div>
      {list.length === 0 ? (
        <EmptyState title={t("flashcards.noCards")} description={t("flashcards.noCardsHint")} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((c) => (
            <li key={c.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]" data-testid="card-item">
              <MarkdownPreview markdown={c.front} />
              <MarkdownPreview markdown={c.back} className="text-muted-foreground" />
              <div className="flex items-start gap-1 sm:flex-col sm:items-end">
                <span className="text-[11px] text-muted-foreground">
                  {c.due_date ? t("flashcards.dueOn", { date: formatDate(`${c.due_date}T00:00:00`) }) : t("flashcards.newCardLabel")}
                </span>
                <div>
                  <Button variant="ghost" size="icon-sm" aria-label={t("flashcards.editCard")} onClick={() => setCardDialog({ open: true, card: c })}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t("common.delete")} onClick={() => void removeCard(c)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(stats ?? []).length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">{t("flashcards.stats")}</h2>
          <StatsChart stats={stats ?? []} />
        </div>
      )}
      <CardDialog open={cardDialog.open} onOpenChange={(o) => setCardDialog((s) => ({ ...s, open: o }))} deckId={deckId} card={cardDialog.card} />
      {deckDialog && <DeckDialog open={deckDialog} onOpenChange={setDeckDialog} deck={deck} />}
      <ConfirmDialog open={confirmDeleteDeck} onOpenChange={setConfirmDeleteDeck} title={t("flashcards.deleteDeck")} description={t("flashcards.deleteDeckHint")} confirmLabel={t("common.delete")} destructive onConfirm={removeDeck} />
    </div>
  );
}
