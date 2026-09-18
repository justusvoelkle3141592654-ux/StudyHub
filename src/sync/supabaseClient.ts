import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/features/cloud/availability";
import { getAppStore } from "@/platform/native";

let client: SupabaseClient | null = null;

/**
 * Supabase client with the auth session persisted through the app store
 * (tauri-plugin-store file in the app data directory on desktop, the
 * app-private directory on Android). Tokens never touch SQLite or the log.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const PREFIX = "supabase-auth:";
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: {
        getItem: async (key) => (await (await getAppStore()).get<string>(PREFIX + key)) ?? null,
        setItem: async (key, value) => (await getAppStore()).set(PREFIX + key, value),
        removeItem: async (key) => (await getAppStore()).delete(PREFIX + key),
      },
    },
    global: { headers: { "x-client-info": "studyhub" } },
  });
  return client;
}
