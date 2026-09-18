-- 0001_init: core schema.
-- Every content table carries the sync fields described in docs/DATENMODELL.md:
--   id, user_id, created_at, updated_at, deleted_at, sync_status, remote_rev
-- Rows are never physically deleted; deleted_at is set instead (soft delete).

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b5bdb',
  teacher TEXT,
  room TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subjects_updated_at ON subjects(updated_at);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  subject_id TEXT REFERENCES subjects(id),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT,
  week_type TEXT NOT NULL DEFAULT 'all' CHECK (week_type IN ('all', 'A', 'B'))
);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_subject_id ON timetable_slots(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_updated_at ON timetable_slots(updated_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  subject_id TEXT REFERENCES subjects(id),
  due_at TEXT,
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  reminder_at TEXT,
  recurrence TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  title TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id),
  date TEXT NOT NULL,
  topics TEXT,
  weight REAL NOT NULL DEFAULT 1,
  reminder_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date);
CREATE INDEX IF NOT EXISTS idx_exams_updated_at ON exams(updated_at);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id),
  kind TEXT NOT NULL CHECK (kind IN ('notes', 'files', 'documents'))
);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_updated_at ON folders(updated_at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  subject_id TEXT REFERENCES subjects(id),
  folder_id TEXT REFERENCES folders(id),
  is_pinned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

CREATE TABLE IF NOT EXISTS note_tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  note_id TEXT NOT NULL REFERENCES notes(id),
  tag TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);
CREATE INDEX IF NOT EXISTS idx_note_tags_updated_at ON note_tags(updated_at);

CREATE TABLE IF NOT EXISTS flashcard_decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  name TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id),
  description TEXT
);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject_id ON flashcard_decks(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_updated_at ON flashcard_decks(updated_at);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  deck_id TEXT NOT NULL REFERENCES flashcard_decks(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due_date ON flashcards(due_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_updated_at ON flashcards(updated_at);

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  card_id TEXT NOT NULL REFERENCES flashcards(id),
  deck_id TEXT NOT NULL REFERENCES flashcard_decks(id),
  reviewed_on TEXT NOT NULL,
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_card_id ON flashcard_reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_deck_id ON flashcard_reviews(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_reviewed_on ON flashcard_reviews(reviewed_on);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_updated_at ON flashcard_reviews(updated_at);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  value REAL NOT NULL,
  scale TEXT NOT NULL CHECK (scale IN ('de_1_6', 'points_0_15', 'percent')),
  weight REAL NOT NULL DEFAULT 1,
  date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date);
CREATE INDEX IF NOT EXISTS idx_grades_updated_at ON grades(updated_at);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  local_path TEXT,
  remote_path TEXT,
  subject_id TEXT REFERENCES subjects(id),
  folder_id TEXT REFERENCES folders(id),
  checksum_sha256 TEXT,
  is_linked INTEGER NOT NULL DEFAULT 0,
  upload_status TEXT NOT NULL DEFAULT 'none' CHECK (upload_status IN ('none', 'pending', 'uploaded', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_files_subject_id ON files(subject_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('text', 'presentation')),
  content_json TEXT NOT NULL DEFAULT '{}',
  folder_id TEXT REFERENCES folders(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

-- Key/value settings. Device-local, not synchronised.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Outbox of local changes waiting to be pushed to the cloud.
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_table TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT,
  is_failed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
