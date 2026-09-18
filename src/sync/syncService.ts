import { toast } from "sonner";
import i18n from "@/i18n";
import { getRepos, isDatabaseOpen } from "@/data/db";
import { configureDataContext } from "@/data/context";
import { dataEvents } from "@/data/events";
import { SETTINGS } from "@/app/settingsKeys";
import { useSettingsStore, getSetting } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";
import { log } from "@/lib/logger";
import { readFileBytes } from "@/features/files/fileService";
import { getSupabase } from "./supabaseClient";
import { SupabaseRemote } from "./supabaseRemote";
import { SyncEngine, detachFromCloud, enqueueAllRows } from "./syncEngine";
import { useSyncStore } from "./syncStore";
import { currentUserId, initAuth, signOut, useAuthStore } from "./auth";

const INTERVAL_MS = 5 * 60_000;
let timer: ReturnType<typeof setInterval> | null = null;
let engine: SyncEngine | null = null;
let listenersInstalled = false;

/** Called once at startup; wires triggers (interval, online event) when cloud mode is on. */
export async function initSyncService(): Promise<void> {
  await initAuth();
  await refreshCounts();
  if (!listenersInstalled) {
    listenersInstalled = true;
    window.addEventListener("online", () => void syncNow("online"));
    dataEvents.subscribe((table) => {
      if (table === "sync_queue" || useAppStore.getState().mode === "cloud") void refreshCounts();
    });
  }
  applyModeFromSettings();
  if (useAppStore.getState().mode === "cloud") void syncNow("startup");
}

function applyModeFromSettings() {
  const mode = useAppStore.getState().mode;
  const userId = currentUserId() ?? getSetting<string | null>(SETTINGS.cloudUserId, null);
  if (mode === "cloud" && userId) {
    configureDataContext({ cloudEnabled: true, userId });
    useSyncStore.getState().set({ status: navigator.onLine ? "idle" : "offline" });
    if (!timer) timer = setInterval(() => void syncNow("interval"), INTERVAL_MS);
  } else {
    configureDataContext({ cloudEnabled: false, userId: "local" });
    useSyncStore.getState().set({ status: "disabled" });
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
}

function getEngine(userId: string): SyncEngine | null {
  const sb = getSupabase();
  if (!sb || !isDatabaseOpen()) return null;
  if (!engine) {
    engine = new SyncEngine({
      repos: getRepos(),
      remote: new SupabaseRemote(sb),
      userId,
      readFileBytes,
      conflictSuffix: (d) => ` (${i18n.t("sync.conflictSuffix")} ${d})`,
      onConflict: (table, winner, copyTitle) => {
        toast.warning(i18n.t("sync.conflictTitle"), { description: i18n.t("sync.conflictBody", { table: i18n.t(`sync.tables.${table}`, { defaultValue: table }), winner: i18n.t(`sync.winner.${winner}`), copy: copyTitle ?? "" }) });
      },
      onUploadProgress: (done, total) => useSyncStore.getState().set({ uploadProgress: total ? { done, total } : null }),
      log: (level, message, detail) => log[level]("sync", message, detail),
    });
  }
  return engine;
}

/** Run one synchronisation cycle. Never throws. */
export async function syncNow(trigger: "startup" | "interval" | "online" | "manual"): Promise<void> {
  const store = useSyncStore.getState();
  if (useAppStore.getState().mode !== "cloud") return;
  const userId = currentUserId();
  if (!userId) {
    store.set({ status: "error", lastError: i18n.t("sync.notSignedIn") });
    return;
  }
  const eng = getEngine(userId);
  if (!eng || eng.isRunning) return;
  if (!navigator.onLine) {
    store.set({ status: "offline" });
    return;
  }
  store.set({ status: "syncing", lastError: null });
  try {
    const res = await eng.run();
    await refreshCounts();
    const lastSyncAt = getSetting<string | null>(SETTINGS.lastSyncAt, null);
    if (res.offline) store.set({ status: "offline", lastSyncAt });
    else store.set({ status: res.failed > 0 ? "error" : "idle", lastSyncAt, lastError: res.failed > 0 ? i18n.t("sync.someFailed", { count: res.failed }) : null, uploadProgress: null });
    log.info("sync", `${trigger}: pushed ${res.pushed}, pulled ${res.pulled}, conflicts ${res.conflicts}, uploaded ${res.uploaded}, failed ${res.failed}${res.offline ? " (offline)" : ""}`);
    if (trigger === "manual" && !res.offline) toast.success(i18n.t("sync.done", { pushed: res.pushed, pulled: res.pulled }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("sync", `${trigger} failed`, e);
    store.set({ status: "error", lastError: msg });
    if (trigger === "manual") toast.error(i18n.t("sync.failed"), { description: msg });
  }
}

async function refreshCounts(): Promise<void> {
  if (!isDatabaseOpen()) return;
  const repos = getRepos();
  useSyncStore.getState().set({ pendingCount: await repos.syncQueue.count(), failedCount: (await repos.syncQueue.getFailed()).length });
}

/**
 * Switch the app to cloud mode for the signed-in user: existing local rows
 * get the user id and are queued for the initial upload.
 */
export async function enableCloudMode(): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error(i18n.t("sync.notSignedIn"));
  const repos = getRepos();
  await useSettingsStore.getState().setMany({ [SETTINGS.mode]: "cloud", [SETTINGS.cloudUserId]: userId, [SETTINGS.cloudEmail]: useAuthStore.getState().email });
  useAppStore.getState().setMode("cloud");
  configureDataContext({ cloudEnabled: true, userId });
  const queued = await enqueueAllRows(repos, userId);
  log.info("sync", `cloud mode enabled, ${queued} rows queued`);
  engine = null;
  applyModeFromSettings();
  await refreshCounts();
  void syncNow("manual");
}

/** Back to offline-only: data stays, queue and cursors are cleared, the session is closed. */
export async function disableCloudMode(): Promise<void> {
  const repos = getRepos();
  await detachFromCloud(repos);
  await useSettingsStore.getState().setMany({ [SETTINGS.mode]: "local", [SETTINGS.cloudUserId]: null, [SETTINGS.cloudEmail]: null });
  useAppStore.getState().setMode("local");
  await signOut().catch(() => undefined);
  engine = null;
  applyModeFromSettings();
  await refreshCounts();
}
