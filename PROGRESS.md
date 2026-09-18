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
- [x] `gradeMath.ts`: weighted / unweighted averages, overall average (mean of subject averages), scale conversion (points ↔ grade via (17 − p)/3, percent ↔ grade via documented anchors), target grade solver; unit tests
- [x] Overview page with subject averages and overall average; subject page with grade list, history chart (SVG) and target grade calculator
- [x] Supports the three scales from the wizard, weighting on/off; grades module hidden when "no grades module" was chosen
- [x] Playwright test: grades + averages + target calculator
## Phase 8 – Files and file-system access, backups
- [x] Files module: folder tree, import via dialog and drag-and-drop (native paths in Tauri, HTML5 files in the browser), subject link, search by name + subject filter
- [x] Import copies into `<working>/files/` (or links only, per setting), computes SHA-256 in Rust (streamed), stores metadata in `files`
- [x] Preview for images, PDF (embedded, desktop) and text; "open externally" through a root-restricted Rust command
- [x] Note ↔ file links in the note editor (`note_files`)
- [x] Daily backup on start to `<working>/backups/studyhub-YYYY-MM-DD.db` (WAL checkpoint first), keeps the last 14; manual "Back up now" + list in settings
- [x] Android branch: working folder = app-private directory, imports via the system picker (SAF through the Tauri dialog), UI hint, no embedded PDF preview
- [x] Browser dev build keeps file contents in IndexedDB so the module is testable; Playwright test for import + preview + note link
- [~] Cloud upload states are shown (pending / uploaded); the actual upload to Supabase Storage is part of phase 9
## Phase 9 – Cloud mode (Supabase)
- [x] `supabase/schema.sql`: all tables with `rev` trigger and `synced_at`, RLS (`user_id = auth.uid()`, no delete policy), storage policies for one private bucket per user
- [x] Auth (e-mail + password, sign-up, password reset) with the session persisted via tauri-plugin-store; `CloudAccountPanel` in wizard step 4 and settings
- [x] `SyncEngine` against a `SyncRemote` interface: push with conflict detection via `rev`, pull with per-table server-time cursors, last-write-wins + "(Konflikt <Datum>)" copies, exponential backoff (1 s … 5 min), failed after 10 attempts, file uploads with progress
- [x] `SupabaseRemote` implementation, `syncService` triggers (start, every 5 min, `online` event, manual button), status in the status bar and in settings (failed entries with retry/discard)
- [x] Switching modes in settings: enabling queues all local rows for upload; disabling clears queue/cursors and signs out. App stays fully usable offline (status "Offline – wird später abgeglichen")
- [x] Files: pending uploads go to storage, remote-only files are downloaded and cached on first preview; auto-upload setting
- [x] Unit tests: conflict resolution, backoff, engine end-to-end against an in-memory remote (push, pull, deletes, both conflict directions, offline retry, 10-attempt failure, upload, initial enqueue)
- [~] Not exercised against a live Supabase project in this environment (no network/credentials); the remote adapter follows the supabase-js 2.x API (`upsert().select().single()`, `gt('synced_at')`, storage `upload`/`download`/`createBucket`)
- [x] README: Supabase setup, env vars, sync description; `.env.example`
## Phase 10 – Office module
- [x] Documents list with folder tree, create text document / presentation, rename, delete, title editing
- [x] Text editor (TipTap 3): headings, bold/italic/underline/strike, lists, quotes, code, tables (insert, rows/columns, delete), images (data URLs), footnotes (custom inline node, CSS-numbered), page breaks (custom block node), undo/redo, word count, autosave
- [x] Text export: PDF (`pdf-lib`, plain A4 with real page breaks and footnotes), DOCX (`docx`: headings, lists with numbering, tables, images, footnotes, page breaks), Markdown (GFM with footnotes)
- [x] Presentation editor: slide list with thumbnails, layouts (title, title+content, two columns, image only, blank), text boxes, images, shapes (rect/ellipse/line), drag to move / corner resize, properties panel, background colour, speaker notes, slide reorder/duplicate/delete
- [x] Presentation mode: fullscreen, keyboard (arrows/space/Escape), click to advance
- [x] Presentation export: PDF (one page per slide, `pdf-lib`) and PPTX (`pptxgenjs` with notes)
- [x] Unit tests: document flattening/Markdown, DOCX + PDF generation, presentation model + PDF/PPTX; Playwright tests for both editors
## Phase 11 – Science and calculation tools
- [x] Unit converter: 17 categories (length, mass, time, temperature, area, volume, speed, force, pressure, energy, power, data, angle, frequency, current, voltage, resistance, capacitance) on top of mathjs; five units mathjs lacks are defined from exact definitions (nmi, knot, light year, cal) or CODATA (u)
- [x] Formula collection: 70 textbook formulas in 11 categories with KaTeX rendering, symbol legends (de/en), search + category filter; every entry is render-tested
- [x] Scientific calculator: mathjs evaluator (imports/unit definitions disabled), degree/radian mode, `ans`, variables, keypad, persisted history (last 100)
- [x] Periodic table: all 118 elements (number, symbol, de/en names, IUPAC abridged atomic weights or mass numbers, group, period, block, category, electron configuration from the Madelung rule + known exceptions); classic 18-column layout with f-block, search, detail dialog. Properties not reliably known (melting points, electronegativity …) are intentionally left out
- [x] Unit tests (conversions, calculator, KaTeX rendering of all formulas, element data consistency incl. electron counts) and a Playwright test
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
| D10 | Percent → grade conversion uses piecewise linear anchors 100→1, 85→2, 70→3, 50→4, 30→5, 0→6; it is only applied when a grade's scale differs from the configured scale (e.g. after switching scales). | Schools differ in their percent tables; a transparent, documented default is better than a hidden one. |
| D11 | Deleting a file entry never deletes bytes on disk (copies in `files/` and linked originals stay). | Brief 7 "avoid data loss"; the entry can be restored by sync/restore, the copy is small compared to the risk. |
| D12 | Pull cursor is the server-side `synced_at` (set by trigger) per table, not the client `updated_at`. | With client timestamps a row edited offline on device A (old `updated_at`) and uploaded after device B's last sync would never reach B. |
| D13 | The Supabase auth session is stored via tauri-plugin-store (app data dir) as the brief prescribes; the Anthropic API key goes to the OS credential store. | Brief 3.6 names the store API for tokens; the keyring blob limit (2.5 KB on Windows) is too small for a full session anyway. |
| D4 | Versions verified against the registries on 2026-09-18: Vite 8.3, React 18.3.1, TypeScript 5.9.3, Tailwind 4.3, Tauri 2.11 (crates 2.x, npm `@tauri-apps/*` 2.x), Vitest 5.0, Playwright 1.63. | Brief section 7: no invented dependencies. |

## Open questions for the project owner
- None blocking so far. Anything unclear is listed here as soon as it comes up.
