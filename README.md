# StudyHub

StudyHub is an offline-first companion app for school, university and professional work:
timetable, tasks, exams, grades, flashcards, notes, files, office documents and science tools.
One code base is built as a Windows desktop app (Tauri 2, `.exe`/`.msi`) and as an Android app (`.apk`).

UI language: German (default) and English. Code, comments and technical docs are English.

## Privacy

Without the optional cloud mode and without the optional AI module **no data ever leaves the device**.
There is no telemetry, no analytics service and no crash reporting to third parties.
All data lives in a local SQLite database in the app data directory (see `docs/DATENMODELL.md`).

## Development

Requirements: Node.js 22+, Rust (stable) and the Tauri 2 prerequisites for your platform
(see https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run dev          # frontend only, in the browser (uses an in-browser SQLite via sql.js)
npm run tauri dev    # full desktop app
npm test             # unit tests (Vitest)
npm run test:e2e     # UI flows (Playwright)
npm run typecheck
```

## Building

### Windows

```bash
npm run tauri build
```

Produces `src-tauri/target/release/StudyHub.exe` plus an NSIS installer (`*-setup.exe`) and an MSI
in `src-tauri/target/release/bundle/`. The NSIS installer is configured for a per-user install
(`installMode: currentUser`), so no administrator rights are required.

### Android

Android build instructions (SDK/NDK setup, signing key) follow in phase 13.

## Cloud mode (optional) – Supabase setup

Cloud synchronisation is off unless the build knows a Supabase project. Nothing about it is
required for the app to work; without it the app is offline-only.

1. Create a Supabase project (https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`. It creates the same tables as the local
   database plus `rev` (server revision, bumped by a trigger) and `synced_at` (server write time),
   enables **Row Level Security** on every table with policies restricted to
   `user_id = auth.uid()`, and adds storage policies for one private bucket per user
   (bucket id = user id, created by the client on first upload).
3. Auth → Providers: enable **Email** (e-mail + password). Configure the e-mail templates for
   confirmation and password reset as you like.
4. Put the project URL and the anon key into a `.env` file (see `.env.example`) before building:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   Both values are public client credentials; access is enforced by RLS. They are compiled into
   the frontend at build time (`npm run build` / `npm run tauri build`).

How synchronisation works (details in `docs/DATENMODELL.md` §5): every write goes to SQLite first;
in cloud mode the repository layer also appends an entry to `sync_queue`. The sync engine
(`src/sync/syncEngine.ts`) pushes the queue, pulls rows by the per-table `synced_at` cursor,
resolves conflicts last-write-wins (the losing version is kept as a "(Konflikt <Datum>)" copy)
and retries network failures with exponential backoff (1 s … 5 min, after 10 failed attempts an
entry is shown in Settings → Cloud as problematic). Triggers: app start, every 5 minutes, when the
connection returns, and the "Sync now" button. The auth session is persisted with
`tauri-plugin-store` in the app data directory (never in SQLite, never in the log).

## AI features (optional, off by default)

The AI module only exists when the user stores their own Anthropic API key (setup step 12 or
Settings → KI-Funktionen). Without a key the buttons are not rendered. Every request first shows
the exact content that will be sent and can be cancelled; requests go directly from the app to
`api.anthropic.com` with the user's key (stored in the OS credential store on Windows, in the
app-private directory on Android). No other data leaves the device.

## Versioning

Semantic versioning. The version is maintained in `package.json`, `src-tauri/tauri.conf.json`
and `src-tauri/Cargo.toml`; keep all three identical.
