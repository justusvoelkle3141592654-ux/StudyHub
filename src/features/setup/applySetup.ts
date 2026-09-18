import { getRepos, closeDatabase, openDatabase, STORE_KEY_DB_PATH } from "@/data/db";
import { SETTINGS } from "@/app/settingsKeys";
import { useAppStore } from "@/stores/appStore";
import { useUiStore } from "@/stores/uiStore";
import { isTauri, getPlatform, isDesktopPlatform } from "@/platform";
import { secrets, SECRET_KEYS } from "@/platform/secrets";
import { log } from "@/lib/logger";
import { configureDataContext } from "@/data/context";
import type { SetupDraft } from "./types";
import { SUBJECT_COLORS } from "./types";

export const WORKING_SUBFOLDERS = ["files", "documents", "exports", "backups"] as const;

/**
 * Persist everything the wizard collected. Nothing is written before this
 * point, so cancelling the wizard leaves no half-configured state.
 */
export async function applySetup(draft: SetupDraft): Promise<void> {
  const platform = await getPlatform();

  // 1. Database location (desktop only). Relocating copies the current file.
  if (isTauri() && isDesktopPlatform(platform)) {
    await applyDatabaseLocation(draft.dbPath);
  }

  const repos = getRepos();

  // 2. Working folder with sub folders (desktop only).
  let workingFolder = draft.workingFolder;
  if (isTauri() && isDesktopPlatform(platform)) {
    const { native, documentsDirectory, joinPath, appDataDirectory } = await import("@/platform/native");
    if (!workingFolder) {
      const docs = await documentsDirectory();
      workingFolder = await joinPath(docs ?? (await appDataDirectory()), "StudyHub");
    }
    const dbDir = (await import("@/data/db")).getDatabase().location.replace(/[\\/][^\\/]+$/, "");
    await native.setAllowedRoots([dbDir, workingFolder]);
    await native.mkdir(workingFolder);
    for (const sub of WORKING_SUBFOLDERS) await native.mkdir(await joinPath(workingFolder, sub));
  }

  // 3. Secrets.
  if (draft.aiEnabled && draft.aiApiKey.trim()) {
    await secrets.set(SECRET_KEYS.anthropicApiKey, draft.aiApiKey.trim());
  } else {
    await secrets.delete(SECRET_KEYS.anthropicApiKey).catch(() => undefined);
  }

  // 4. Settings.
  await repos.settings.setMany({
    [SETTINGS.setupCompleted]: true,
    [SETTINGS.profile]: draft.profile,
    [SETTINGS.mode]: draft.mode,
    [SETTINGS.workingFolder]: workingFolder,
    [SETTINGS.linkFilesInsteadOfCopy]: draft.linkFilesInsteadOfCopy,
    [SETTINGS.timetableDays]: draft.timetableDays,
    [SETTINGS.timetableLessonsPerDay]: draft.lessonsPerDay,
    [SETTINGS.timetableLessonTimes]: draft.lessonTimes,
    [SETTINGS.timetableAbWeeks]: draft.abWeeks,
    [SETTINGS.gradesEnabled]: draft.gradeScale !== "none",
    [SETTINGS.gradeScale]: draft.gradeScale === "none" ? "de_1_6" : draft.gradeScale,
    [SETTINGS.gradesWeighted]: draft.gradesWeighted,
    [SETTINGS.flashcardsDailyNew]: draft.flashcardsDailyNew,
    [SETTINGS.flashcardsIntensity]: draft.flashcardsIntensity,
    [SETTINGS.notificationsEnabled]: draft.notificationsEnabled,
    [SETTINGS.notificationsLeadMinutes]: draft.notificationsLeadMinutes,
    [SETTINGS.dailyReminderTime]: draft.dailyReminderEnabled ? draft.dailyReminderTime : null,
    [SETTINGS.aiEnabled]: draft.aiEnabled && !!draft.aiApiKey.trim(),
  });

  // 5. Appearance + language (also persisted in the UI store).
  const ui = useUiStore.getState();
  ui.setLanguage(draft.language);
  ui.setTheme(draft.theme);
  ui.setFontSize(draft.fontSize);
  ui.setDensity(draft.density);

  // 6. Subjects (skip names that already exist, e.g. when the wizard is re-run).
  const existing = await repos.subjects.getAll();
  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s]));
  let order = existing.length;
  for (const s of draft.subjects) {
    const name = s.name.trim();
    if (!name || byName.has(name.toLowerCase())) continue;
    const created = await repos.subjects.insert({ name, color: s.color, sort_order: order++ });
    byName.set(name.toLowerCase(), created);
  }

  // 7. Imports.
  const ensureSubject = async (name: string) => {
    const key = name.trim().toLowerCase();
    const found = byName.get(key);
    if (found) return found;
    const created = await repos.subjects.insert({
      name: name.trim(),
      color: SUBJECT_COLORS[byName.size % SUBJECT_COLORS.length],
      sort_order: order++,
    });
    byName.set(key, created);
    return created;
  };
  for (const g of draft.import.grades) {
    const subject = await ensureSubject(g.subject);
    await repos.grades.insert({
      subject_id: subject.id,
      title: g.title,
      value: g.value,
      scale: g.scale ?? (draft.gradeScale === "none" ? "de_1_6" : draft.gradeScale),
      weight: g.weight,
      date: g.date,
    });
  }
  for (const t of draft.import.tasks) {
    const subject = t.subject ? await ensureSubject(t.subject) : null;
    await repos.tasks.insert({ title: t.title, subject_id: subject?.id ?? null, due_at: t.due_at, priority: t.priority, description: t.description });
  }
  if (draft.import.cards.length) {
    const decks = new Map<string, string>();
    for (const c of draft.import.cards) {
      let deckId = decks.get(c.deck);
      if (!deckId) {
        const deck = await repos.decks.insert({ name: c.deck });
        deckId = deck.id;
        decks.set(c.deck, deckId);
      }
      await repos.flashcards.insert({ deck_id: deckId, front: c.front, back: c.back });
    }
  }
  if (draft.import.notes.length) {
    const folders = new Map<string, string>();
    for (const n of draft.import.notes) {
      let folderId: string | null = null;
      if (n.folder) {
        folderId = folders.get(n.folder) ?? null;
        if (!folderId) {
          const f = await repos.folders.insert({ name: n.folder, kind: "notes" });
          folderId = f.id;
          folders.set(n.folder, folderId);
        }
      }
      await repos.notes.insert({ title: n.title, content_markdown: n.content_markdown, folder_id: folderId });
    }
  }

  // 8. App state.
  await (await import("@/stores/settingsStore")).useSettingsStore.getState().load();
  await (await import("@/features/files/fileService")).registerFileRoots();
  await (await import("@/ai/aiStore")).useAiStore.getState().refresh();
  const app = useAppStore.getState();
  app.setProfile(draft.profile);
  app.setSetupCompleted(true);
  if (draft.mode === "cloud") {
    // Requires a signed-in account (wizard step 4); otherwise fall back to local mode.
    const { currentUserId } = await import("@/sync/auth");
    const { enableCloudMode } = await import("@/sync/syncService");
    if (currentUserId()) await enableCloudMode();
    else {
      await repos.settings.set(SETTINGS.mode, "local");
      app.setMode("local");
      configureDataContext({ cloudEnabled: false });
    }
  } else {
    app.setMode("local");
    configureDataContext({ cloudEnabled: false, userId: "local" });
  }
  await repos.db.flush();
  log.info("setup", `setup completed (profile=${draft.profile}, mode=${draft.mode})`);
}

/** Move the database to a user-chosen path (desktop). */
async function applyDatabaseLocation(dbPath: string | null): Promise<void> {
  const { getAppStore, native } = await import("@/platform/native");
  const { getDatabase } = await import("@/data/db");
  const store = await getAppStore();
  const currentPath = getDatabase().location;
  if (!dbPath || dbPath === currentPath) return;
  const targetDir = dbPath.replace(/[\\/][^\\/]+$/, "");
  const currentDir = currentPath.replace(/[\\/][^\\/]+$/, "");
  await native.setAllowedRoots([currentDir, targetDir]);
  await native.mkdir(targetDir);
  await closeDatabase();
  if (!(await native.exists(dbPath))) {
    await native.copyFile(currentPath, dbPath);
  }
  await store.set(STORE_KEY_DB_PATH, dbPath);
  await openDatabase();
  log.info("setup", `database relocated to ${dbPath}`);
}

/** Pre-fill the wizard from the stored settings when it is re-run. */
export async function buildDraftFromSettings(): Promise<SetupDraft> {
  const { createDefaultDraft } = await import("./types");
  const repos = getRepos();
  const s = await repos.settings.getAll();
  const ui = useUiStore.getState();
  const subjects = await repos.subjects.getAll();
  const draft = createDefaultDraft(ui.language);
  const pick = <T,>(key: string, fallback: T): T => (s[key] === undefined || s[key] === null ? fallback : (s[key] as T));
  let dbPath: string | null = null;
  if (isTauri()) {
    const { getAppStore } = await import("@/platform/native");
    dbPath = await (await getAppStore()).get<string>(STORE_KEY_DB_PATH);
  }
  return {
    ...draft,
    profile: pick(SETTINGS.profile, draft.profile),
    mode: pick(SETTINGS.mode, draft.mode),
    dbPath,
    workingFolder: pick(SETTINGS.workingFolder, null),
    linkFilesInsteadOfCopy: pick(SETTINGS.linkFilesInsteadOfCopy, false),
    subjects: subjects.map((x) => ({ name: x.name, color: x.color })),
    timetableDays: pick(SETTINGS.timetableDays, draft.timetableDays),
    lessonsPerDay: pick(SETTINGS.timetableLessonsPerDay, draft.lessonsPerDay),
    lessonTimes: pick(SETTINGS.timetableLessonTimes, draft.lessonTimes),
    abWeeks: pick(SETTINGS.timetableAbWeeks, false),
    gradeScale: pick(SETTINGS.gradesEnabled, true) ? pick(SETTINGS.gradeScale, draft.gradeScale) : "none",
    gradesWeighted: pick(SETTINGS.gradesWeighted, true),
    flashcardsDailyNew: pick(SETTINGS.flashcardsDailyNew, draft.flashcardsDailyNew),
    flashcardsIntensity: pick(SETTINGS.flashcardsIntensity, draft.flashcardsIntensity),
    notificationsEnabled: pick(SETTINGS.notificationsEnabled, false),
    notificationsLeadMinutes: pick(SETTINGS.notificationsLeadMinutes, 60),
    dailyReminderEnabled: !!pick<string | null>(SETTINGS.dailyReminderTime, null),
    dailyReminderTime: pick<string | null>(SETTINGS.dailyReminderTime, null) ?? "18:00",
    aiEnabled: pick(SETTINGS.aiEnabled, false),
    aiApiKey: (await secrets.get(SECRET_KEYS.anthropicApiKey)) ?? "",
    theme: ui.theme,
    fontSize: ui.fontSize,
    density: ui.density,
  };
}
