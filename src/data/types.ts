/** Sync-related columns present on every content table (brief section 3.3). */
export interface SyncFields {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
  remote_rev: number | null;
}

export type SyncStatus = "local" | "pending" | "synced";

export interface Subject extends SyncFields {
  name: string;
  color: string;
  teacher: string | null;
  room: string | null;
  sort_order: number;
}

export type WeekType = "all" | "A" | "B";

export interface TimetableSlot extends SyncFields {
  subject_id: string | null;
  weekday: number; // 1 = Monday … 7 = Sunday
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  room: string | null;
  week_type: WeekType;
}

export type TaskStatus = "open" | "done";
export type TaskPriority = 1 | 2 | 3;
/** Recurrence rule stored as a small JSON string, e.g. {"freq":"weekly","interval":1}. */
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface Task extends SyncFields {
  title: string;
  description: string | null;
  subject_id: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  reminder_at: string | null;
  recurrence: string | null;
  completed_at: string | null;
}

export interface Exam extends SyncFields {
  title: string;
  subject_id: string | null;
  date: string;
  topics: string | null;
  weight: number;
  reminder_at: string | null;
}

export type FolderKind = "notes" | "files" | "documents";

export interface Folder extends SyncFields {
  name: string;
  parent_id: string | null;
  kind: FolderKind;
}

export interface Note extends SyncFields {
  title: string;
  content_markdown: string;
  subject_id: string | null;
  folder_id: string | null;
  is_pinned: number;
}

export interface NoteTag extends SyncFields {
  note_id: string;
  tag: string;
}

export interface NoteFile extends SyncFields {
  note_id: string;
  file_id: string;
}

export interface FlashcardDeck extends SyncFields {
  name: string;
  subject_id: string | null;
  description: string | null;
}

export interface Flashcard extends SyncFields {
  deck_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_date: string | null;
}

export interface FlashcardReview extends SyncFields {
  card_id: string;
  deck_id: string;
  reviewed_on: string; // YYYY-MM-DD
  quality: number; // 0-5
  was_new: number; // 1 when this was the card's first review
}

export type GradeScale = "de_1_6" | "points_0_15" | "percent";

export interface Grade extends SyncFields {
  subject_id: string;
  title: string;
  value: number;
  scale: GradeScale;
  weight: number;
  date: string;
}

export type UploadStatus = "none" | "pending" | "uploaded" | "failed";

export interface FileEntry extends SyncFields {
  name: string;
  mime_type: string | null;
  size_bytes: number;
  local_path: string | null;
  remote_path: string | null;
  subject_id: string | null;
  folder_id: string | null;
  checksum_sha256: string | null;
  is_linked: number;
  upload_status: UploadStatus;
}

export type DocType = "text" | "presentation";

export interface Document extends SyncFields {
  title: string;
  doc_type: DocType;
  content_json: string;
  folder_id: string | null;
}

export interface SyncQueueEntry {
  id: string;
  entity_table: string;
  entity_id: string;
  operation: "upsert" | "delete";
  payload_json: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string | null;
  is_failed: number;
  created_at: string;
}

/** Data supplied by callers when creating a row (sync fields are generated). */
export type NewEntity<T extends SyncFields> = Omit<T, keyof SyncFields>;
export type EntityPatch<T extends SyncFields> = Partial<Omit<T, keyof SyncFields>>;
