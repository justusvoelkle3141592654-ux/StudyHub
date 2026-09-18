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

Version numbers live in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`
(semantic versioning; keep all three identical). Builds for both platforms also run in GitHub
Actions (`.github/workflows/build.yml`): the Windows job produces the installers, the Android job
the APK (signed when the keystore secrets are configured).

### Windows (.exe + installer)

Requirements: Windows 10/11, Node.js 22+, Rust stable (`rustup`), Microsoft Visual Studio C++
Build Tools, WebView2 runtime (part of Windows 11; the NSIS installer bootstraps it on Windows 10).

```bash
npm ci
npm run tauri build
```

Output in `src-tauri/target/release/`:

- `StudyHub.exe` – the portable executable
- `bundle/nsis/StudyHub_<version>_x64-setup.exe` – installer, per-user install
  (`installMode: currentUser`, **no administrator rights needed**)
- `bundle/msi/StudyHub_<version>_x64_en-US.msi` – MSI package (per-user as well)

On the first start the app creates its database in `%APPDATA%\de.studyhub.app\`, runs all
migrations and opens the setup wizard – no manual preparation required.

### Android (.apk)

Requirements: Android Studio (SDK 34, NDK, command-line tools), JDK 17, Rust targets
`aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
(`rustup target add …`), the environment variables `ANDROID_HOME` and `NDK_HOME`.

```bash
npm ci
npm run tauri android init      # generates src-tauri/gen/android (once)
npm run tauri android build -- --apk
```

Unsigned/debug-signed APKs land in `src-tauri/gen/android/app/build/outputs/apk/`. For a
**signed release APK**:

1. Create a keystore once (keep it outside the repository and back it up):

   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias studyhub
   ```

2. Copy the keystore into `src-tauri/gen/android/` and create `src-tauri/gen/android/keystore.properties` there (both git-ignored; `storeFile` is relative to that folder):

   ```
   storeFile=upload-keystore.jks
   storePassword=<password>
   keyAlias=studyhub
   keyPassword=<password>
   ```

3. Add the signing config to the generated Gradle project and build:

   ```bash
   node scripts/android-signing.mjs
   npm run tauri android build -- --apk
   ```

   The script inserts a `release` signing config that reads `keystore.properties`
   into `src-tauri/gen/android/app/build.gradle.kts`.

`.gitignore` excludes `*.jks`, `*.keystore`, `keystore.properties` and the generated Android
build output; **never commit the key**. In CI the keystore is provided as the base64 secret
`ANDROID_KEYSTORE_BASE64` together with `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and
`ANDROID_KEY_PASSWORD`.

On Android the app keeps all data in its private app directory; files are imported through the
system picker (Storage Access Framework) and copied into that directory.

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
