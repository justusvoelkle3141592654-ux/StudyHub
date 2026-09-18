import { isTauri } from "./index";

/**
 * Secret storage (auth tokens, API keys). Inside Tauri the values go to the
 * OS credential store (desktop) or the app-private directory (Android) via
 * Rust commands. In the browser dev build they live in sessionStorage only.
 */
export const SECRET_KEYS = {
  anthropicApiKey: "anthropic_api_key",
  supabaseSession: "supabase_session",
} as const;

export const secrets = {
  async set(key: string, value: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("secret_set", { key, value });
    } else {
      sessionStorage.setItem(`studyhub-secret:${key}`, value);
    }
  },
  async get(key: string): Promise<string | null> {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return (await invoke<string | null>("secret_get", { key })) ?? null;
    }
    return sessionStorage.getItem(`studyhub-secret:${key}`);
  },
  async delete(key: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("secret_delete", { key });
    } else {
      sessionStorage.removeItem(`studyhub-secret:${key}`);
    }
  },
};
