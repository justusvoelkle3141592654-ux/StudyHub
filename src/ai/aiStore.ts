import { create } from "zustand";
import { SETTINGS } from "@/app/settingsKeys";
import { getSetting, useSettingsStore } from "@/stores/settingsStore";
import { secrets, SECRET_KEYS } from "@/platform/secrets";

/** Models offered in the settings; the first one is the default. */
export const AI_MODELS = [
  { id: "claude-opus-5", label: "Claude Opus 5" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;
export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

interface AiState {
  /** True only when the feature is switched on AND a key is stored. Buttons are hidden otherwise. */
  available: boolean;
  hasKey: boolean;
  refresh: () => Promise<void>;
  setKey: (key: string) => Promise<void>;
  clearKey: () => Promise<void>;
}

export const useAiStore = create<AiState>()((set) => ({
  available: false,
  hasKey: false,
  refresh: async () => {
    const enabled = getSetting<boolean>(SETTINGS.aiEnabled, false);
    const key = await secrets.get(SECRET_KEYS.anthropicApiKey).catch(() => null);
    set({ hasKey: !!key, available: enabled && !!key });
  },
  setKey: async (key) => {
    await secrets.set(SECRET_KEYS.anthropicApiKey, key.trim());
    await useSettingsStore.getState().set(SETTINGS.aiEnabled, true);
    set({ hasKey: true, available: true });
  },
  clearKey: async () => {
    await secrets.delete(SECRET_KEYS.anthropicApiKey);
    await useSettingsStore.getState().set(SETTINGS.aiEnabled, false);
    set({ hasKey: false, available: false });
  },
}));

export function getAiModel(): string {
  return getSetting<string>(SETTINGS.aiModel, DEFAULT_AI_MODEL);
}
