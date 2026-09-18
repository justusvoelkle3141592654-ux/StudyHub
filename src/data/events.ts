/** Tiny event bus so UI stores can refresh after repository writes. */
type Listener = (table: string, ids: string[]) => void;

const listeners = new Set<Listener>();

export const dataEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(table: string, ids: string[] = []): void {
    for (const l of listeners) {
      try {
        l(table, ids);
      } catch (e) {
        console.error("data event listener failed", e);
      }
    }
  },
};
