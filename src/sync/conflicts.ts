import type { SyncFields } from "@/data/types";
import type { RemoteRow } from "./remote";

/** Tables whose rows carry a human-readable label that can get a "(Konflikt …)" suffix. */
export const TITLE_COLUMN: Record<string, string> = {
  subjects: "name",
  tasks: "title",
  exams: "title",
  notes: "title",
  flashcard_decks: "name",
  grades: "title",
  folders: "name",
  files: "name",
  documents: "title",
  flashcards: "front",
};

export interface ConflictResolution {
  /** Which side wins (last write wins by updated_at; ties go to the remote). */
  winner: "local" | "remote";
  /** A copy of the losing version to keep, or null when the table has no title column. */
  loserCopy: Record<string, unknown> | null;
}

/**
 * Last-write-wins with a preserved copy of the loser. Pure: does not touch
 * the database. `conflictDate` is used for the suffix, `newId` for the copy.
 */
export function resolveConflict(
  table: string,
  local: SyncFields & Record<string, unknown>,
  remote: RemoteRow,
  newId: string,
  conflictDate: Date = new Date(),
  suffix: (date: string) => string = (d) => ` (Konflikt ${d})`,
): ConflictResolution {
  const localTime = Date.parse(local.updated_at);
  const remoteTime = Date.parse(remote.updated_at);
  const winner: "local" | "remote" = Number.isFinite(localTime) && Number.isFinite(remoteTime) && localTime > remoteTime ? "local" : "remote";
  const titleCol = TITLE_COLUMN[table];
  if (!titleCol) return { winner, loserCopy: null };

  const loser = winner === "local" ? remote : local;
  // A deleted loser has nothing worth keeping.
  if (loser.deleted_at) return { winner, loserCopy: null };
  const dateLabel = conflictDate.toISOString().slice(0, 10);
  const { rev: _rev, sync_status: _s, remote_rev: _r, ...content } = loser as Record<string, unknown>;
  const copy: Record<string, unknown> = {
    ...content,
    id: newId,
    [titleCol]: `${String(loser[titleCol] ?? "")}${suffix(dateLabel)}`,
    created_at: conflictDate.toISOString(),
    updated_at: conflictDate.toISOString(),
    deleted_at: null,
  };
  return { winner, loserCopy: copy };
}

/** Exponential backoff: 1 s, 2 s, 4 s … capped at 5 minutes. */
export function backoffMs(attempts: number): number {
  return Math.min(5 * 60_000, 1000 * 2 ** Math.max(0, attempts));
}

export const MAX_ATTEMPTS = 10;
