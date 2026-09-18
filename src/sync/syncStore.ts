import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "disabled";

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  lastError: string | null;
  /** File uploads in the current run: done / total. */
  uploadProgress: { done: number; total: number } | null;
  set: (patch: Partial<Omit<SyncState, "set">>) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: "disabled",
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  lastError: null,
  uploadProgress: null,
  set: (patch) => set(patch),
}));
