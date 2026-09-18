/**
 * Runtime context for the data layer. The sync engine and the settings
 * store update it; repositories read it on every write so that switching
 * between local and cloud mode never requires code changes.
 */
export interface DataContext {
  /** Supabase user id in cloud mode, the fixed value `local` otherwise. */
  userId: string;
  /** When true every write is mirrored into `sync_queue`. */
  cloudEnabled: boolean;
}

export const dataContext: DataContext = {
  userId: "local",
  cloudEnabled: false,
};

export function configureDataContext(patch: Partial<DataContext>): void {
  Object.assign(dataContext, patch);
}
