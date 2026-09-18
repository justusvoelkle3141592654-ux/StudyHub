import { getRepos } from "@/data/db";
import type { Flashcard } from "@/data/types";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting } from "@/stores/settingsStore";
import type { ReviewIntensity } from "@/features/setup/types";
import { todayKey } from "@/lib/dates";
import { sm2 } from "./sm2";

export interface SessionQueue {
  cards: Flashcard[];
  dueCount: number;
  newCount: number;
  /** New cards still allowed today (after subtracting the ones already learned). */
  newAllowance: number;
}

/**
 * Build today's queue: all due review cards plus new cards up to the daily
 * limit from the settings (0 = unlimited). Review cards come first.
 */
export async function buildSessionQueue(deckId?: string): Promise<SessionQueue> {
  const repos = getRepos();
  const today = todayKey();
  const dailyNew = getSetting<number>(SETTINGS.flashcardsDailyNew, 10);
  const learnedToday = await repos.reviews.countNewOn(today);
  const newAllowance = dailyNew > 0 ? Math.max(0, dailyNew - learnedToday) : Number.POSITIVE_INFINITY;

  const due = (await repos.flashcards.getDue(today, deckId)).filter((c) => c.repetitions > 0 || c.due_date !== null);
  const fresh = await repos.flashcards.getNew(deckId);
  const newCards = fresh.slice(0, Number.isFinite(newAllowance) ? newAllowance : fresh.length);
  return { cards: [...due, ...newCards], dueCount: due.length, newCount: newCards.length, newAllowance };
}

/** Grade a card, persist the SM-2 result and log the review. */
export async function answerCard(card: Flashcard, quality: number): Promise<Flashcard> {
  const repos = getRepos();
  const intensity = getSetting<ReviewIntensity>(SETTINGS.flashcardsIntensity, "normal");
  const wasNew = card.repetitions === 0 && card.due_date === null;
  const result = sm2(card, quality, { intensity });
  const updated = await repos.flashcards.update(card.id, {
    ease_factor: result.ease_factor,
    interval_days: result.interval_days,
    repetitions: result.repetitions,
    due_date: result.due_date,
  });
  await repos.reviews.insert({ card_id: card.id, deck_id: card.deck_id, reviewed_on: todayKey(), quality, was_new: wasNew ? 1 : 0 });
  return updated;
}
