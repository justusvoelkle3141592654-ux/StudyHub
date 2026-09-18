import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Flashcard } from "@/data/types";
import { MarkdownPreview } from "@/features/notes/MarkdownPreview";
import { reportError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { answerCard, buildSessionQueue } from "./studySession";
import { EmptyState } from "@/components/EmptyState";

const QUALITIES = [0, 1, 2, 3, 4, 5] as const;
const QUALITY_CLASS: Record<number, string> = {
  0: "border-destructive/60 hover:bg-destructive/10",
  1: "border-destructive/40 hover:bg-destructive/10",
  2: "border-warning/60 hover:bg-warning/10",
  3: "border-warning/40 hover:bg-warning/10",
  4: "border-success/50 hover:bg-success/10",
  5: "border-success/70 hover:bg-success/10",
};

/**
 * Study session: shows the front, reveals the back on demand, grades 0–5.
 * Keyboard: Space/Enter reveals, keys 0–5 grade. Lapsed cards (< 3) are
 * re-queued at the end of the session until answered correctly.
 */
export function StudySession() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deckId } = useParams();
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void buildSessionQueue(deckId)
      .then((q) => {
        if (cancelled) return;
        setQueue(q.cards);
        setTotal(q.cards.length);
      })
      .catch((e) => toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "queue failed", e) }));
    return () => {
      cancelled = true;
    };
  }, [deckId, t]);

  const current = queue?.[0] ?? null;

  const grade = useCallback(
    async (quality: number) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await answerCard(current, quality);
        setQueue((q) => {
          if (!q) return q;
          const rest = q.slice(1);
          // Re-queue lapses so the session ends with every card answered correctly once.
          return quality < 3 ? [...rest, { ...current, repetitions: 0, interval_days: 1 }] : rest;
        });
        if (quality >= 3) {
          setDone((d) => d + 1);
          setCorrect((c) => c + 1);
        }
        setRevealed(false);
      } catch (e) {
        toast.error(t("common.errorGeneric"), { description: reportError("flashcards", "answer failed", e) });
      } finally {
        setBusy(false);
      }
    },
    [current, busy, t],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && /^[0-5]$/.test(e.key)) {
        e.preventDefault();
        void grade(Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  const backTo = deckId ? `/flashcards/${deckId}` : "/flashcards";

  if (queue === null) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  if (!current) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          icon={<CheckCircle2 className="size-10 text-success" />}
          title={total === 0 ? t("flashcards.nothingDue") : t("flashcards.sessionDone")}
          description={total === 0 ? t("flashcards.nothingDueHint") : t("flashcards.sessionSummary", { count: total, correct })}
          action={
            <Button onClick={() => navigate(backTo)} data-testid="session-back">
              <ArrowLeft /> {t("common.back")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4" data-testid="study-session">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backTo}>
            <ArrowLeft /> {t("common.back")}
          </Link>
        </Button>
        <Progress value={total ? (done / total) * 100 : 0} className="flex-1" aria-label={t("flashcards.progress")} />
        <span className="text-sm tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("flashcards.front")}</p>
        <MarkdownPreview markdown={current.front} className="text-lg" />
        {revealed && (
          <>
            <hr className="my-4" />
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("flashcards.back")}</p>
            <div data-testid="card-back-shown">
              <MarkdownPreview markdown={current.back} className="text-lg" />
            </div>
          </>
        )}
      </div>
      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)} data-testid="reveal">
          {t("flashcards.showAnswer")} <kbd className="ml-2 rounded bg-primary-foreground/20 px-1.5 text-xs">Space</kbd>
        </Button>
      ) : (
        <div>
          <p className="mb-2 text-center text-sm text-muted-foreground">{t("flashcards.howWell")}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {QUALITIES.map((q) => (
              <Button key={q} variant="outline" className={cn("h-auto flex-col gap-0.5 py-2", QUALITY_CLASS[q])} onClick={() => void grade(q)} disabled={busy} data-testid={`grade-${q}`}>
                <span className="text-lg font-semibold">{q}</span>
                <span className="text-[11px] font-normal text-muted-foreground">{t(`flashcards.quality.${q}`)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
