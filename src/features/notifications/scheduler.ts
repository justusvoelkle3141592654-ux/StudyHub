import { isTauri } from "@/platform";
import { getRepos, isDatabaseOpen } from "@/data/db";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting, useSettingsStore } from "@/stores/settingsStore";
import { hasNotificationPermission } from "./permission";
import { log } from "@/lib/logger";
import i18n from "@/i18n";
import { todayKey } from "@/lib/dates";

const SENT_KEY = "notifications.sent";
const CHECK_INTERVAL_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;

/** Show a system notification (Tauri plugin or browser API). */
export async function showNotification(title: string, body: string): Promise<void> {
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      n.sendNotification({ title, body });
    } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (e) {
    log.warn("notifications", "sending failed", e);
  }
}

/**
 * Reminder scheduler: once a minute, look for task/exam reminders that are
 * due and not yet sent, plus the daily study reminder. Sent ids are kept
 * in the settings table so restarts do not repeat them.
 */
export function startReminderScheduler(): void {
  if (timer) return;
  const run = () => void checkReminders();
  timer = setInterval(run, CHECK_INTERVAL_MS);
  run();
}

export function stopReminderScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

export async function checkReminders(): Promise<void> {
  if (!isDatabaseOpen()) return;
  if (!getSetting<boolean>(SETTINGS.notificationsEnabled, false)) return;
  if (!(await hasNotificationPermission())) return;
  const repos = getRepos();
  const nowIso = new Date().toISOString();
  const sent = new Set(getSetting<string[]>(SENT_KEY, []));
  const newlySent: string[] = [];

  const tasks = await repos.tasks.getOpen();
  for (const task of tasks) {
    if (task.reminder_at && task.reminder_at <= nowIso && !sent.has(`task:${task.id}`)) {
      await showNotification(i18n.t("notifications.taskDue"), task.title);
      newlySent.push(`task:${task.id}`);
    }
  }
  const exams = await repos.exams.getAll();
  for (const exam of exams) {
    if (exam.reminder_at && exam.reminder_at <= nowIso && exam.date >= todayKey() && !sent.has(`exam:${exam.id}`)) {
      await showNotification(i18n.t("notifications.examSoon"), `${exam.title} · ${exam.date}`);
      newlySent.push(`exam:${exam.id}`);
    }
  }
  const dailyTime = getSetting<string | null>(SETTINGS.dailyReminderTime, null);
  if (dailyTime) {
    const key = `daily:${todayKey()}`;
    const [h, m] = dailyTime.split(":").map(Number);
    const now = new Date();
    if (!sent.has(key) && (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m))) {
      const due = await repos.flashcards.countDue(todayKey());
      await showNotification(i18n.t("notifications.dailyTitle"), i18n.t("notifications.dailyBody", { count: due }));
      newlySent.push(key);
    }
  }
  if (newlySent.length) {
    // Keep the list bounded; old entries are irrelevant once their time passed.
    const merged = [...sent, ...newlySent].slice(-500);
    await useSettingsStore.getState().set(SENT_KEY, merged);
  }
}
