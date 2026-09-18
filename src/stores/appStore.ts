import { create } from "zustand";

/** Storage mode chosen in the setup wizard. */
export type StorageMode = "local" | "cloud";
export type UsageProfile = "school" | "university" | "work" | "mixed";

interface AppState {
  /** True once the database is open and migrations ran. */
  ready: boolean;
  /** Fatal startup error, shown instead of the app. */
  startupError: string | null;
  mode: StorageMode;
  profile: UsageProfile;
  setupCompleted: boolean;
  setReady: (ready: boolean) => void;
  setStartupError: (error: string | null) => void;
  setMode: (mode: StorageMode) => void;
  setProfile: (profile: UsageProfile) => void;
  setSetupCompleted: (done: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  ready: false,
  startupError: null,
  mode: "local",
  profile: "mixed",
  setupCompleted: false,
  setReady: (ready) => set({ ready }),
  setStartupError: (startupError) => set({ startupError }),
  setMode: (mode) => set({ mode }),
  setProfile: (profile) => set({ profile }),
  setSetupCompleted: (setupCompleted) => set({ setupCompleted }),
}));
