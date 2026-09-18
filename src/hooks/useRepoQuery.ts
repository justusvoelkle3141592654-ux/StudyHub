import { useCallback, useEffect, useRef, useState } from "react";
import { dataEvents } from "@/data/events";
import { log } from "@/lib/logger";

/**
 * Run a repository query and re-run it whenever one of the given tables
 * changes. Keeps the UI in sync with writes from anywhere in the app.
 */
export function useRepoQuery<T>(
  query: () => Promise<T>,
  tables: string[],
  deps: unknown[] = [],
): { data: T | undefined; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    queryRef
      .current()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          log.error("query", "repository query failed", e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    const set = new Set(tables);
    return dataEvents.subscribe((table) => {
      if (set.has(table)) setTick((t) => t + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
