import { isTauri } from "@/platform";
import { log } from "@/lib/logger";

/** Ask the OS/browser for notification permission. Only call after the user opted in. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      if (await n.isPermissionGranted()) return true;
      return (await n.requestPermission()) === "granted";
    }
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    return (await Notification.requestPermission()) === "granted";
  } catch (e) {
    log.warn("notifications", "permission request failed", e);
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      return n.isPermissionGranted();
    }
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
}
