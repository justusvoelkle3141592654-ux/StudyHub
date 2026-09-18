/**
 * Platform detection helpers.
 *
 * The app runs inside a Tauri 2 WebView (Windows / Android) or, during
 * development and automated tests, in a plain browser. Everything that
 * touches the native layer branches on `isTauri()`.
 */

export type PlatformKind = "windows" | "android" | "linux" | "macos" | "ios" | "browser" | "unknown";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let cachedPlatform: PlatformKind | null = null;

/** Resolve the platform once. Falls back to `browser` outside Tauri. */
export async function getPlatform(): Promise<PlatformKind> {
  if (cachedPlatform) return cachedPlatform;
  if (!isTauri()) {
    cachedPlatform = "browser";
    return cachedPlatform;
  }
  try {
    const os = await import("@tauri-apps/plugin-os");
    const p = os.platform();
    cachedPlatform = (["windows", "android", "linux", "macos", "ios"].includes(p) ? p : "unknown") as PlatformKind;
  } catch {
    cachedPlatform = "unknown";
  }
  return cachedPlatform;
}

/** Desktop platforms have free file-system access; mobile ones do not. */
export function isDesktopPlatform(p: PlatformKind): boolean {
  return p === "windows" || p === "linux" || p === "macos";
}

export function isMobilePlatform(p: PlatformKind): boolean {
  return p === "android" || p === "ios";
}
