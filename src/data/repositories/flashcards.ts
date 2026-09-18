import { BaseRepository } from "../repository";
import type { DbAdapter } from "../db/adapter";
import type { Flashcard, FlashcardDeck, FlashcardReview, NewEntity } from "../types";

export class FlashcardDeckRepository extends BaseRepository<FlashcardDeck, "subject_id" | "description"> {
  constructor(db: DbAdapter) {
    super(db, "flashcard_decks", ["name", "subject_id", "description"]);
  }

  override getAll() {
    return this.query("", [], { orderBy: "name COLLATE NOCASE ASC" });
  }

  protected override applyDefaults(data: Parameters<FlashcardDeckRepository["insert"]>[0]): NewEntity<FlashcardDeck> {
    return { subject_id: null, description: null, ...data };
  }
}

export class FlashcardRepository extends BaseRepository<Flashcard, "ease_factor" | "interval_days" | "repetitions" | "due_date"> {
  constructor(db: DbAdapter) {
    super(db, "flashcards", ["deck_id", "front", "back", "ease_factor", "interval_days", "repetitions", "due_date"]);
  }

  getByDeck(deckId: string) {
    return this.query("deck_id = ?", [deckId], { orderBy: "created_at ASC" });
  }

  /** Cards due on or before `today` (YYYY-MM-DD) or never reviewed. */
  getDue(today: string, deckId?: string, limit?: number) {
    const where = deckId ? "deck_id = ? AND (due_date IS NULL OR due_date <= ?)" : "due_date IS NULL OR due_date <= ?";
    const params = deckId ? [deckId, today] : [today];
    return this.query(where, params, { orderBy: "due_date IS NULL, due_date ASC", limit });
  }

  /** Never-reviewed cards (new cards). */
  getNew(deckId?: string, limit?: number) {
    const where = deckId ? "deck_id = ? AND repetitions = 0 AND due_date IS NULL" : "repetitions = 0 AND due_date IS NULL";
    return this.query(where, deckId ? [deckId] : [], { orderBy: "created_at ASC", limit });
  }

  countDue(today: string, deckId?: string) {
    return deckId
      ? this.count("deck_id = ? AND (due_date IS NULL OR due_date <= ?)", [deckId, today])
      : this.count("due_date IS NULL OR due_date <= ?", [today]);
  }

  countByDeck(deckId: string) {
    return this.count("deck_id = ?", [deckId]);
  }

  protected override applyDefaults(data: Parameters<FlashcardRepository["insert"]>[0]): NewEntity<Flashcard> {
    return { ease_factor: 2.5, interval_days: 0, repetitions: 0, due_date: null, ...data };
  }
}

export class FlashcardReviewRepository extends BaseRepository<FlashcardReview, "was_new"> {
  constructor(db: DbAdapter) {
    super(db, "flashcard_reviews", ["card_id", "deck_id", "reviewed_on", "quality", "was_new"]);
  }

  countOn(day: string, deckId?: string) {
    return deckId ? this.count("reviewed_on = ? AND deck_id = ?", [day, deckId]) : this.count("reviewed_on = ?", [day]);
  }

  /** Number of cards learned for the first time on the given day. */
  countNewOn(day: string) {
    return this.count("reviewed_on = ? AND was_new = 1", [day]);
  }

  protected override applyDefaults(data: Parameters<FlashcardReviewRepository["insert"]>[0]): NewEntity<FlashcardReview> {
    return { was_new: 0, ...data };
  }

  /** Per-day statistics: reviewed cards and hit rate (quality >= 3). */
  async dailyStats(days = 30, deckId?: string): Promise<Array<{ day: string; reviewed: number; correct: number }>> {
    const rows = await this.db.select<{ day: string; reviewed: number; correct: number }>(
      `SELECT reviewed_on AS day, COUNT(*) AS reviewed, SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) AS correct
       FROM flashcard_reviews WHERE deleted_at IS NULL${deckId ? " AND deck_id = ?" : ""}
       GROUP BY reviewed_on ORDER BY reviewed_on DESC LIMIT ?`,
      deckId ? [deckId, days] : [days],
    );
    return rows.map((r) => ({ day: r.day, reviewed: Number(r.reviewed), correct: Number(r.correct) })).reverse();
  }
}
