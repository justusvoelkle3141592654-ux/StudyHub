import { create } from "zustand";
import { createDefaultDraft, type SetupDraft, WIZARD_STEP_COUNT } from "./types";

interface SetupState {
  step: number; // 1-based
  draft: SetupDraft;
  /** True while `applySetup` is running. */
  saving: boolean;
  error: string | null;
  setStep: (step: number) => void;
  /** Advance, skipping steps for which `skip` returns true. Uses the store state so rapid clicks cannot be lost. */
  next: (skip?: (step: number) => boolean) => void;
  back: (skip?: (step: number) => boolean) => void;
  patch: (patch: Partial<SetupDraft>) => void;
  reset: (draft?: SetupDraft) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSetupStore = create<SetupState>()((set) => ({
  step: 1,
  draft: createDefaultDraft(),
  saving: false,
  error: null,
  setStep: (step) => set({ step: Math.min(Math.max(1, step), WIZARD_STEP_COUNT) }),
  next: (skip) =>
    set((s) => {
      let n = s.step + 1;
      while (n < WIZARD_STEP_COUNT && skip?.(n)) n++;
      return { step: Math.min(n, WIZARD_STEP_COUNT) };
    }),
  back: (skip) =>
    set((s) => {
      let n = s.step - 1;
      while (n > 1 && skip?.(n)) n--;
      return { step: Math.max(n, 1) };
    }),
  patch: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: (draft) => set({ step: 1, draft: draft ?? createDefaultDraft(), error: null, saving: false }),
  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),
}));
