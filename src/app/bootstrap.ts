import { openDatabase } from "@/data/db";
import { configureDataContext } from "@/data/context";
import { useAppStore, type StorageMode, type UsageProfile } from "@/stores/appStore";
import { log } from "@/lib/logger";
import { SETTINGS } from "./settingsKeys";
import { useSettingsStore } from "@/stores/settingsStore";
import { startReminderScheduler } from "@/features/notifications/scheduler";

/**
 * Application start: open the database, run migrations, load settings.
 * Never requires network access.
 */
export async function bootstrap(): Promise<void> {
  const app = useAppStore.getState();
  try {
    const { repos } = await openDatabase();
    await useSettingsStore.getState().load();
    const settings = await repos.settings.getAll();
    const mode = (settings[SETTINGS.mode] as StorageMode | undefined) ?? "local";
    const profile = (settings[SETTINGS.profile] as UsageProfile | undefined) ?? "mixed";
    app.setMode(mode);
    app.setProfile(profile);
    app.setSetupCompleted(settings[SETTINGS.setupCompleted] === true);
    configureDataContext({ cloudEnabled: mode === "cloud" });
    app.setReady(true);
    startReminderScheduler();
  } catch (e) {
    log.error("bootstrap", "startup failed", e);
    app.setStartupError(e instanceof Error ? e.message : String(e));
  }
}
