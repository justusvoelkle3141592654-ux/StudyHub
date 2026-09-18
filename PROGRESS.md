# StudyHub – Progress

Working log for the development order defined in the project brief (section 8).
Each phase ends in a runnable state and its own commit.

Legend: `[x]` done · `[ ]` open · `[~]` partially done (details in text)

## Phase 1 – Project scaffold
- [x] Vite 8 + React 18 + TypeScript 5.9 project with `@/` alias
- [x] Tailwind CSS 4 (`@tailwindcss/vite`) with shadcn/ui-style component set (`src/components/ui`)
- [x] lucide-react icons, Zustand stores, React Router (hash router)
- [x] App layout: collapsible sidebar, mobile drawer, header, status bar (mode / offline / version)
- [x] Light / dark / system theme, font size and density preferences (`uiStore`, persisted)
- [x] i18n (i18next): German default, English option
- [x] Tauri 2 shell: `src-tauri` with all required plugins registered (sql, fs, dialog, store, notification, os)
- [x] Least-privilege capability file `src-tauri/capabilities/default.json`
- [x] Icons generated with `tauri icon` from `public/icon.svg`
- [x] Version kept in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` (0.1.0)

## Phase 2 – Database layer
- [x] `DbAdapter` interface with two implementations: `TauriSqlAdapter` (tauri-plugin-sql) and `SqlJsAdapter` (browser dev + Vitest)
- [x] Migration runner (`src/data/db/migrations.ts`) with `schema_migrations`, transactional per migration, `-- @requires` capability flags
- [x] `migrations/0001_init.sql`: all tables from brief 3.4 (+ `flashcard_reviews` for statistics) with sync fields and indexes
- [x] `migrations/0002_notes_fts.sql`: FTS5 index + triggers for notes
- [x] Backup of the database file before pending migrations, restore on failure (Tauri)
- [x] `BaseRepository`: auto `updated_at`, `sync_status`, soft delete, `sync_queue` entries only in cloud mode
- [x] Repositories for every entity, `SettingsRepository`, `SyncQueueRepository`
- [x] Rust commands: SHA-256, rotating log file (10 MB), file copy/list/remove restricted to registered roots
- [x] Startup gate (`AppShell`): loading → fatal error page → app
- [x] Unit tests: migrations (splitting, ordering, rollback, skip), repository rules, settings, note tags/search
- [x] `docs/DATENMODELL.md`

## Phase 3 – Setup wizard (15 steps, offline first)
- [x] `src/features/setup`: 15 steps, progress bar, back / next / "set up later", summary with jump-to-step
- [x] Nothing is persisted before "Finish setup" (`applySetup`), so cancelling leaves no half state
- [x] Auto-start on first run (`RequireSetup` route guard), re-runnable from settings with pre-filled values
- [x] Profile-based subject suggestions, timetable skeleton (days, lessons, times, A/B weeks)
- [x] Grade scale + weighting, flashcard daily goal + intensity, notification opt-in (OS permission asked only on opt-in)
- [x] AI step: off by default, API key stored via OS credential store (Rust `keyring`) / Android private dir
- [x] Data import: CSV (grades, tasks), Anki text export (cards), Markdown files or folder (notes) with parsers + unit tests
- [x] Database relocation (desktop) and working folder with `files/ documents/ exports/ backups/`
- [x] Playwright test for the full wizard flow (`e2e/setup-wizard.spec.ts`)
- [~] Cloud mode option is shown but disabled until phase 9 (no Supabase configured); account step shows a note

## Phase 4 – Subjects, timetable, tasks, exams, dashboard
- [x] Subjects page (name, colour, teacher, room), reusable subject select/badge
- [x] Timetable: week and day view on a time grid, A/B weeks with parity toggle, slot dialog with lesson-time presets
- [x] Tasks: list grouped by overdue/today/week/later/no date, filters (status, due, subject), calendar month view (tasks + exams)
- [x] Recurring tasks (daily/weekly/monthly × interval): completing creates the next occurrence (unit-tested rule logic)
- [x] Reminders: per-task lead time, per-exam days-before; scheduler checks every minute and sends system notifications (Tauri plugin / browser API), sent ids persisted
- [x] Exams: upcoming/past lists, topics, weight, reminder
- [x] Dashboard: profile-based tiles (today's timetable, due tasks, exams in 14 days, due flashcards, recent notes/documents), drag-and-drop reorder persisted in settings
- [x] Module visibility per profile drives the sidebar (`src/app/modules.ts`)
- [x] Settings mirror store (`settingsStore`) + reactive repository queries (`useRepoQuery`)
- [x] Playwright: create/complete/filter task, timetable slot visible on dashboard
## Phase 5 – Notes with full-text search
- [x] Three-pane notes module: folder tree (create/rename/delete, nested), tag filter, search; list; editor at `/notes/:id`
- [x] Markdown editor (editor / split / preview modes) with live GFM preview, debounced autosave, pin, subject and folder assignment
- [x] Tags as chips (`note_tags` rows, synchronisable)
- [x] Full-text search: FTS5 (`notes_fts`, `bm25` ranking) in Tauri, LIKE fallback in the browser build
- [x] Export: single note or whole folder as Markdown or plain PDF (`pdf-lib`, Helvetica, A4)
- [x] `note_files` link table (migration 0003) for note ↔ file links; UI follows in phase 8 with the files module
- [x] Playwright test: note creation, live preview, tags, search
## Phase 6 – Flashcards with SM-2
- [x] `sm2.ts`: pure SM-2 implementation (ease factor, interval, repetitions, due date), intensity modifier + starting ease; unit tests for first review, lapse, ease floor, very long intervals, clamped quality
- [x] Decks per subject, cards with Markdown front/back and embedded images (data URLs, ≤ 2 MB)
- [x] Study session with daily new-card limit (`flashcard_reviews.was_new`, migration 0004), reveal + 0–5 grading, keyboard shortcuts, lapses re-queued within the session
- [x] Statistics: cards per day and hit rate over the last 14 days (inline SVG chart), per deck and overall
- [x] Dashboard tile shows the number of cards due today
- [x] Playwright test: deck + cards + full study session
## Phase 7 – Grades
## Phase 8 – Files and file-system access, backups
## Phase 9 – Cloud mode (Supabase)
## Phase 10 – Office module
## Phase 11 – Science and calculation tools
## Phase 12 – AI features (optional)
## Phase 13 – Tests, polish, Windows and Android builds

## Decisions and deviations from the brief

| # | Decision | Reason |
|---|----------|--------|
| D1 | **Tailwind CSS 4** instead of the Tailwind 3 setup shadcn/ui historically used. Components are hand-written in shadcn/ui style on top of Radix primitives rather than generated by the shadcn CLI. | Tailwind 4 is the current major; the CLI needs an interactive init that does not fit an unattended build. Behaviour and API of the components match shadcn/ui. |
| D2 | **Hash-based routing** (`createHashRouter`). | Works without a server-side fallback under the Vite dev server, the Tauri production protocol and Playwright alike. |
| D3 | Appearance preferences (theme, font size, density, language) live in `localStorage` via Zustand `persist`, mirrored into the `settings` table from phase 2 on. | They must apply before the database is open to avoid a flash of the wrong theme. |
| D5 | sql.js (browser/test SQLite) has no FTS5. Note search uses FTS5 inside Tauri (verified: sqlx bundles SQLite with `SQLITE_ENABLE_FTS5`) and a LIKE fallback in the browser dev build. Migration `0002` is flagged `-- @requires fts5`. | Keeps the real app on FTS5 as required while dev/test stay runnable. |
| D6 | Path-based file operations on user-chosen folders (custom DB directory, working folder) go through small Rust commands that only accept paths inside roots registered at startup. The fs plugin scope stays limited to the app data directory. | The fs plugin scope is static; user-chosen folders are only known at runtime. |
| D7 | The app data folder is named after the Tauri identifier (`de.studyhub.app`), i.e. `%APPDATA%\de.studyhub.app\studyhub.db` instead of `…\StudyHub\…`. | Android requires a reverse-domain identifier; Tauri derives the folder from it. |
| D8 | Anki import supports the plain-text export ("Notes in Plain Text", .txt with `#separator` headers), not `.apkg` archives. | `.apkg` is a zip with an SQLite database inside; parsing it in the WebView would need a zip + SQLite reader and adds little value for a first-run import. |
| D9 | Secrets (API key, later auth tokens) are stored through Rust: `keyring` crate (Windows Credential Manager) on desktop, a JSON file in the app-private directory on Android (no keyring backend exists there; Android isolates and encrypts app-private storage). In the browser dev build they live in `sessionStorage`. | Brief 3.6 / 4 step 12: never store secrets in SQLite or logs. |
| D4 | Versions verified against the registries on 2026-09-18: Vite 8.3, React 18.3.1, TypeScript 5.9.3, Tailwind 4.3, Tauri 2.11 (crates 2.x, npm `@tauri-apps/*` 2.x), Vitest 5.0, Playwright 1.63. | Brief section 7: no invented dependencies. |

## Open questions for the project owner
- None blocking so far. Anything unclear is listed here as soon as it comes up.
