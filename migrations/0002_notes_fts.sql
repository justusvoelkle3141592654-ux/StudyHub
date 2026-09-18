-- 0002_notes_fts: full-text index for notes (SQLite FTS5).
-- @requires fts5
-- External-content table: the FTS index only stores tokens, the text stays in `notes`.

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  content_markdown,
  content='notes',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS notes_fts_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content_markdown) VALUES (new.rowid, new.title, new.content_markdown);
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content_markdown) VALUES ('delete', old.rowid, old.title, old.content_markdown);
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content_markdown) VALUES ('delete', old.rowid, old.title, old.content_markdown);
  INSERT INTO notes_fts(rowid, title, content_markdown) VALUES (new.rowid, new.title, new.content_markdown);
END;

-- Rebuild once so rows created before this migration are indexed.
INSERT INTO notes_fts(notes_fts) VALUES ('rebuild');
