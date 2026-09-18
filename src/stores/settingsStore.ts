import { create } from "zustand";
import { getRepos } from "@/data/db";

/**
 * In-memory mirror of the `settings` table so components can read
 * settings synchronously. `set` writes through to the database.
 */
interface SettingsState {
  values: Record<string, unknown>;
  loaded: boolean;
  load: () => Promise<void>;
  set: (key: string, value: unknown) => Promise<void>;
  setMany: (values: Record<string, unknown>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  values: {},
  loaded: false,
  load: async () => {
    const values = await getRepos().settings.getAll();
    set({ values, loaded: true });
  },
  set: async (key, value) => {
    await getRepos().settings.set(key, value);
    set({ values: { ...get().values, [key]: value } });
  },
  setMany: async (values) => {
    await getRepos().settings.setMany(values);
    set({ values: { ...get().values, ...values } });
  },
}));

/** Read a setting with a fallback (reactive). */
export function useSetting<T>(key: string, fallback: T): T {
  return useSettingsStore((s) => (s.values[key] === undefined || s.values[key] === null ? fallback : (s.values[key] as T)));
}

export function getSetting<T>(key: string, fallback: T): T {
  const v = useSettingsStore.getState().values[key];
  return v === undefined || v === null ? fallback : (v as T);
}
