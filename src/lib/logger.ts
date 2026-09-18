import { isTauri } from "@/platform";

type Level = "debug" | "info" | "warn" | "error";

let appendLine: ((line: string) => Promise<void>) | null = null;
const buffer: string[] = [];

async function getAppender() {
  if (appendLine) return appendLine;
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  appendLine = (line: string) => invoke<void>("append_log", { line });
  return appendLine;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function write(level: Level, scope: string, message: string, detail?: unknown) {
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${scope}: ${message}${detail !== undefined ? ` | ${formatError(detail)}` : ""}`;
  const fn = console[level === "debug" ? "debug" : level === "info" ? "info" : level === "warn" ? "warn" : "error"];
  fn(line);
  const appender = await getAppender();
  if (!appender) return;
  buffer.push(line);
  try {
    while (buffer.length) {
      const next = buffer.shift()!;
      await appender(next);
    }
  } catch {
    /* logging must never throw */
  }
}

/**
 * Application logger. Writes to the console and, inside Tauri, to the
 * rotating log file `studyhub.log` in the app data directory. Secrets
 * (tokens, API keys) must never be passed to the logger.
 */
export const log = {
  debug: (scope: string, message: string, detail?: unknown) => void write("debug", scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) => void write("info", scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => void write("warn", scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => void write("error", scope, message, detail),
};

/** User-facing error text (German/English handled by caller) + log entry. */
export function reportError(scope: string, message: string, err: unknown): string {
  log.error(scope, message, err);
  return err instanceof Error ? err.message : String(err);
}
