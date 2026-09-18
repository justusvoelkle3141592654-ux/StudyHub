/**
 * Thin wrappers around the Rust commands in `src-tauri/src/commands.rs`
 * and the Tauri path/store APIs. Only callable inside Tauri.
 */
import { isTauri } from "./index";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error(`Native command ${cmd} is not available outside Tauri`);
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export interface DirEntryInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified_ms: number | null;
}

export interface FileInfo {
  size: number;
  is_dir: boolean;
  modified_ms: number | null;
}

export const native = {
  appVersion: () => invoke<string>("app_version"),
  setAllowedRoots: (paths: string[]) => invoke<void>("set_allowed_roots", { paths }),
  copyFile: (from: string, to: string) => invoke<number>("fs_copy_file", { from, to }),
  removeFile: (path: string) => invoke<void>("fs_remove_file", { path }),
  mkdir: (path: string) => invoke<void>("fs_mkdir", { path }),
  listDir: (path: string) => invoke<DirEntryInfo[]>("fs_list_dir", { path }),
  exists: (path: string) => invoke<boolean>("fs_exists", { path }),
  stat: (path: string) => invoke<FileInfo>("fs_stat", { path }),
  readFile: async (path: string) => new Uint8Array(await invoke<number[]>("fs_read_file", { path })),
  writeFile: (path: string, data: Uint8Array) => invoke<void>("fs_write_file", { path, data: Array.from(data) }),
  sha256File: (path: string) => invoke<string>("sha256_file", { path }),
  logFilePath: () => invoke<string>("log_file_path"),
  openPathExternal: (path: string) => invoke<void>("open_path_external", { path }),
};

/** Resolve the app data directory (creates it if needed). */
export async function appDataDirectory(): Promise<string> {
  const { appDataDir } = await import("@tauri-apps/api/path");
  const dir = await appDataDir();
  await native.mkdir(dir);
  return dir;
}

export async function joinPath(...parts: string[]): Promise<string> {
  const { join } = await import("@tauri-apps/api/path");
  return join(...parts);
}

export async function documentsDirectory(): Promise<string | null> {
  try {
    const { documentDir } = await import("@tauri-apps/api/path");
    return await documentDir();
  } catch {
    return null;
  }
}

/**
 * Small persistent key/value store for values that must be available before
 * the SQLite database is open (database path, working folder, mode) and for
 * secrets (auth tokens, API keys). Backed by tauri-plugin-store on Tauri and
 * by localStorage in the browser.
 */
export interface AppStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

const STORE_FILE = "studyhub-settings.json";
let storePromise: Promise<AppStore> | null = null;

export function getAppStore(): Promise<AppStore> {
  if (!storePromise) {
    storePromise = (async () => {
      if (isTauri()) {
        const { load } = await import("@tauri-apps/plugin-store");
        const store = await load(STORE_FILE, { autoSave: true, defaults: {} });
        return {
          get: async <T,>(key: string) => ((await store.get<T>(key)) ?? null) as T | null,
          set: async (key: string, value: unknown) => {
            await store.set(key, value);
            await store.save();
          },
          delete: async (key: string) => {
            await store.delete(key);
            await store.save();
          },
        };
      }
      const prefix = "studyhub-store:";
      return {
        get: async <T,>(key: string) => {
          try {
            const raw = localStorage.getItem(prefix + key);
            return raw === null ? null : (JSON.parse(raw) as T);
          } catch {
            return null;
          }
        },
        set: async (key: string, value: unknown) => {
          localStorage.setItem(prefix + key, JSON.stringify(value));
        },
        delete: async (key: string) => {
          localStorage.removeItem(prefix + key);
        },
      };
    })();
  }
  return storePromise;
}
