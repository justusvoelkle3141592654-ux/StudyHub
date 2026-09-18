/**
 * Cloud mode requires a configured Supabase project. The URL and anon key
 * are compiled in from environment variables (see README); without them the
 * cloud option stays disabled in the wizard and the settings.
 */
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isCloudAvailable(): boolean {
  return getSupabaseConfig() !== null;
}
