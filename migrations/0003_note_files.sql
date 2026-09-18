-- 0003_note_files: n:m link between notes and files (brief 5.3 "Verknüpfung von Notizen mit Dateien").

CREATE TABLE IF NOT EXISTS note_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  remote_rev INTEGER,
  note_id TEXT NOT NULL REFERENCES notes(id),
  file_id TEXT NOT NULL REFERENCES files(id)
);
CREATE INDEX IF NOT EXISTS idx_note_files_note_id ON note_files(note_id);
CREATE INDEX IF NOT EXISTS idx_note_files_file_id ON note_files(file_id);
CREATE INDEX IF NOT EXISTS idx_note_files_updated_at ON note_files(updated_at);
