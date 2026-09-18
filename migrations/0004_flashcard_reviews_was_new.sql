-- 0004: remember whether a review was the first one for a card, so the
-- daily limit for new cards can be enforced across restarts.

ALTER TABLE flashcard_reviews ADD COLUMN was_new INTEGER NOT NULL DEFAULT 0;
