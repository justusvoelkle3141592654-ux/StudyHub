# StudyHub – Datenmodell und Synchronisation

Technische Referenz für das lokale SQLite-Schema und das Sync-Verfahren.
(Dokumentation auf Deutsch gemäß Auftrag; Code und Kommentare sind Englisch.)

## 1. Grundprinzip: lokal zuerst

Die App arbeitet ausschließlich gegen die lokale SQLite-Datenbank. Jede Änderung wird sofort
lokal geschrieben. Die Cloud (Supabase) ist eine optionale Schicht, die im Hintergrund abgleicht.
Es gibt genau zwei Code-Pfade, die eine Internetverbindung voraussetzen: die Synchronisation
(`src/sync/`) und das optionale KI-Modul (`src/ai/`).

### Speicherort

| Plattform | Pfad |
|-----------|------|
| Windows | `%APPDATA%\de.studyhub.app\studyhub.db` (Tauri `appDataDir()`, Ordnername = App-Identifier) |
| Android | privates App-Verzeichnis, ebenfalls `appDataDir()` |
| Desktop, abweichend | vom Nutzer im Assistenten gewählter Ordner; der Pfad steht unter `dbPath` in `studyhub-settings.json` (tauri-plugin-store) |
| Browser (Entwicklung/Tests) | sql.js im Speicher, Abbild in IndexedDB (`studyhub-sqljs`) |

Die Datenbank wird über `tauri-plugin-sql` (sqlx, gebündeltes SQLite mit FTS5) geöffnet.
`PRAGMA foreign_keys = ON` und `journal_mode = WAL` sind gesetzt.

### Migrationen

Alle Tabellen werden ausschließlich über nummerierte Dateien in `migrations/` angelegt
(`0001_init.sql`, `0002_notes_fts.sql`, …). Beim Start werden nicht angewandte Migrationen
in Reihenfolge ausgeführt und in `schema_migrations` (`version`, `name`, `applied_at`, `skipped`)
vermerkt. Jede Migration läuft in einer Transaktion. Vor einer anstehenden Migration wird die
Datenbankdatei nach `<DB-Ordner>/migration-backups/studyhub-pre-migration-<Zeitstempel>.db`
kopiert; schlägt die Migration fehl, wird die Kopie zurückgespielt und der Nutzer sieht eine
Fehlerseite. Eine Migration kann mit `-- @requires fts5` markiert werden; fehlt die Fähigkeit
(nur im Browser-Entwicklungsmodus der Fall), wird sie als `skipped` vermerkt.

## 2. Sync-Felder

Jede inhaltliche Tabelle hat diese Spalten:

| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| `id` | TEXT PRIMARY KEY | UUID v4, lokal erzeugt |
| `user_id` | TEXT | Supabase-User-ID im Cloud-Modus, sonst `local` |
| `created_at` | TEXT NOT NULL | ISO-8601 UTC |
| `updated_at` | TEXT NOT NULL | ISO-8601 UTC, bei jeder Änderung neu |
| `deleted_at` | TEXT | NULL = aktiv; gesetzt = gelöscht (Soft Delete) |
| `sync_status` | TEXT NOT NULL | `local` (Offline-Modus), `pending` (wartet auf Push), `synced` |
| `remote_rev` | INTEGER | Versionsnummer vom Server, NULL wenn nie synchronisiert |

Es wird nie physisch gelöscht (`DELETE FROM`) – ausgenommen sind die Hilfstabellen `settings`
und `sync_queue`. Alle Abfragen der Repository-Schicht filtern standardmäßig `deleted_at IS NULL`.
Auf allen Tabellen liegt ein Index auf `updated_at`, auf allen Fremdschlüsseln ein Index,
zusätzlich auf `tasks.due_at`, `exams.date`, `flashcards.due_date`, `grades.date`.

## 3. Tabellen

Zusätzlich zu den Sync-Feldern:

| Tabelle | Spalten |
|---------|---------|
| `subjects` | `name`, `color`, `teacher`, `room`, `sort_order` |
| `timetable_slots` | `subject_id`, `weekday` (1–7, 1 = Montag), `start_time`, `end_time` (`HH:MM`), `room`, `week_type` (`all`, `A`, `B`) |
| `tasks` | `title`, `description`, `subject_id`, `due_at`, `priority` (1–3), `status` (`open`, `done`), `reminder_at`, `recurrence` (JSON: `{"freq":"weekly","interval":1}`), `completed_at` |
| `exams` | `title`, `subject_id`, `date`, `topics`, `weight`, `reminder_at` |
| `notes` | `title`, `content_markdown`, `subject_id`, `folder_id`, `is_pinned` |
| `note_tags` | `note_id`, `tag` (n:m; eigene Zeile je Tag, damit synchronisierbar) |
| `flashcard_decks` | `name`, `subject_id`, `description` |
| `flashcards` | `deck_id`, `front`, `back`, `ease_factor` (REAL, Start 2.5), `interval_days`, `repetitions`, `due_date` (`YYYY-MM-DD`) |
| `flashcard_reviews` | `card_id`, `deck_id`, `reviewed_on` (`YYYY-MM-DD`), `quality` (0–5) – Grundlage der Lernstatistik |
| `grades` | `subject_id`, `title`, `value` (REAL), `scale` (`de_1_6`, `points_0_15`, `percent`), `weight`, `date` |
| `folders` | `name`, `parent_id` (selbstreferenzierend), `kind` (`notes`, `files`, `documents`) |
| `files` | `name`, `mime_type`, `size_bytes`, `local_path`, `remote_path`, `subject_id`, `folder_id`, `checksum_sha256`, `is_linked`, `upload_status` |
| `documents` | `title`, `doc_type` (`text`, `presentation`), `content_json`, `folder_id` |

Hilfstabellen ohne Sync-Felder:

| Tabelle | Spalten | Zweck |
|---------|---------|-------|
| `settings` | `key` PK, `value_json`, `updated_at` | Gerätelokale App-Einstellungen |
| `sync_queue` | `id`, `entity_table`, `entity_id`, `operation` (`upsert`, `delete`), `payload_json`, `attempts`, `last_error`, `next_attempt_at`, `is_failed`, `created_at` | Ausgangs-Warteschlange für die Cloud |
| `schema_migrations` | `version`, `name`, `applied_at`, `skipped` | Migrationsstand |
| `notes_fts` | FTS5 (external content auf `notes`) | Volltextsuche; Trigger halten den Index aktuell |

## 4. Datenzugriffsschicht

`src/data/repository.ts` enthält `BaseRepository`; je Entität gibt es ein Repository in
`src/data/repositories/`. Der übrige Anwendungscode setzt nie direkt SQL ab. Jede
Schreiboperation setzt automatisch `updated_at`, setzt `sync_status` auf `pending` (Cloud-Modus)
bzw. `local` und legt – nur im Cloud-Modus – einen Eintrag in `sync_queue` an. Der Modus steht
im `dataContext` (`src/data/context.ts`); der Wechsel ist reine Konfiguration.

Die Datenbank ist hinter dem Interface `DbAdapter` (`src/data/db/adapter.ts`) abstrahiert:
`TauriSqlAdapter` (App) und `SqlJsAdapter` (Browser-Entwicklung und Vitest).

## 5. Sync-Verfahren (Cloud-Modus)

Implementiert in `src/sync/syncEngine.ts` (Engine, gegen das Interface `SyncRemote` getestet),
`src/sync/supabaseRemote.ts` (Supabase-Anbindung) und `src/sync/syncService.ts` (Auslöser, Status):

1. **Push**: Einträge aus `sync_queue` in Reihenfolge an Supabase senden (`upsert` je Tabelle).
   Vorher wird die Server-Zeile gelesen; weicht ihr `rev` vom lokal bekannten `remote_rev` ab,
   liegt ein Konflikt vor (siehe 3). Bei Erfolg: Queue-Eintrag entfernen, lokal
   `sync_status = 'synced'` und `remote_rev` aus der Serverantwort übernehmen.
2. **Pull**: Je Tabelle alle Server-Zeilen mit `synced_at > settings.sync.cursor.<Tabelle>`
   abrufen (Serverzeit des Schreibvorgangs, nicht der Client-Zeitstempel – so gehen offline
   bearbeitete und später hochgeladene Zeilen anderer Geräte nicht verloren) und lokal übernehmen;
   anschließend den Cursor fortschreiben. `settings.sync.lastSyncAt` hält die Zeit des letzten
   erfolgreichen Durchlaufs für die Anzeige.
3. **Konflikte**: Ist eine Zeile lokal (`pending`) und entfernt geändert, gewinnt der neuere
   `updated_at`-Wert (Last-Write-Wins). Die unterlegene Version wird als Kopie mit dem Zusatz
   „ (Konflikt <Datum>)“ im Titel gespeichert; der Nutzer erhält eine Benachrichtigung.
4. **Fehler**: Bei Netzwerkfehlern bleibt die Queue erhalten; erneuter Versuch mit exponentiellem
   Backoff (1 s, 2 s, 4 s … maximal 5 Minuten, gespeichert in `next_attempt_at`). Nach 10 Fehlversuchen
   wird der Eintrag mit `is_failed = 1` markiert und im Sync-Statusbereich angezeigt.
5. **Auslöser**: App-Start, alle 5 Minuten, Rückkehr der Internetverbindung, manueller Knopf.

Server-seitig existieren dieselben Tabellen (`supabase/schema.sql`) mit zusätzlichen Spalten
`rev BIGINT` (per Trigger bei jedem Insert/Update hochgezählt) und `synced_at` (Serverzeit);
Row Level Security erlaubt nur Zeilen mit `user_id = auth.uid()`, es gibt keine Delete-Policy.
Dateien liegen in Supabase Storage in einem privaten Bucket je Nutzer (Bucket-ID = User-ID) unter
`files/<Datei-ID>/<Name>`; in der Tabelle `files` steht nur `remote_path`. Beim Einschalten des
Cloud-Modus werden alle vorhandenen lokalen Zeilen dem Nutzer zugeordnet und in die Queue gestellt.

## 6. Notenberechnung

- Fachdurchschnitt = gewichtetes Mittel der Noten des Fachs (Gewicht 1, wenn Gewichtung deaktiviert).
- Gesamtdurchschnitt = Mittel der Fachdurchschnitte (jedes Fach zählt einmal).
- Umrechnung bei abweichender Skala einer Note: Punkte ↔ Note über `Note = (17 − Punkte) / 3`;
  Prozent ↔ Note stückweise linear über die Stützstellen 100→1, 85→2, 70→3, 50→4, 30→5, 0→6.
- Zielnotenrechner: löst `(S + w·v) / (W + w) = X` nach `v` auf (S = gewichtete Summe, W = Gewichtssumme,
  w = Gewicht der nächsten Arbeit, X = Wunschschnitt).

## 7. Dateien und Sicherungen

- Arbeitsordner (Desktop: im Assistenten gewählt, Standard `Dokumente/StudyHub`; Android: privates
  App-Verzeichnis) mit `files/`, `documents/`, `exports/`, `backups/`.
- Import: Datei nach `files/<id-prefix>-<name>` kopieren (oder nur verlinken, `is_linked = 1`),
  SHA-256 in Rust berechnen, Metadaten in `files`. Einträge werden nur soft-gelöscht; Dateien auf der
  Festplatte bleiben erhalten.
- Sicherung: einmal täglich beim Start (`settings.backup.lastDate`) Kopie der Datenbank nach
  `backups/studyhub-JJJJ-MM-TT.db` (nach `PRAGMA wal_checkpoint(TRUNCATE)`); nur die letzten 14 bleiben.
- Native Pfadbefehle (Kopieren, Löschen, Auflisten, extern Öffnen) akzeptieren nur Pfade unterhalb
  der beim Start registrierten Wurzeln (Datenbankordner, Arbeitsordner) bzw. des App-Datenverzeichnisses.
