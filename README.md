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

## Versioning

Semantic versioning. The version is maintained in `package.json`, `src-tauri/tauri.conf.json`
and `src-tauri/Cargo.toml`; keep all three identical.
