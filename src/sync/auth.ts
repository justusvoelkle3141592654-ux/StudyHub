import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseClient";
import { log } from "@/lib/logger";

interface AuthState {
  userId: string | null;
  email: string | null;
  initialised: boolean;
  set: (patch: Partial<Omit<AuthState, "set">>) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({ userId: null, email: null, initialised: false, set: (patch) => set(patch) }));

function apply(session: Session | null) {
  useAuthStore.getState().set({ userId: session?.user.id ?? null, email: session?.user.email ?? null, initialised: true });
}

/** Restore a persisted session and follow auth changes. Safe to call without a configured client. */
export async function initAuth(): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    useAuthStore.getState().set({ initialised: true });
    return;
  }
  try {
    const { data } = await sb.auth.getSession();
    apply(data.session);
  } catch (e) {
    log.warn("auth", "session restore failed", e);
    useAuthStore.getState().set({ initialised: true });
  }
  sb.auth.onAuthStateChange((_event, session) => apply(session));
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud not configured");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud not configured");
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { needsConfirmation: !data.session };
}

export async function resetPassword(email: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud not configured");
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  apply(null);
}

export function currentUserId(): string | null {
  return useAuthStore.getState().userId;
}
