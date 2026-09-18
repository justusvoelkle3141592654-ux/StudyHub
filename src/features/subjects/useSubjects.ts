import { useMemo } from "react";
import { getRepos } from "@/data/db";
import { useRepoQuery } from "@/hooks/useRepoQuery";
import type { Subject } from "@/data/types";

export function useSubjects() {
  const { data, loading } = useRepoQuery(() => getRepos().subjects.getAll(), ["subjects"]);
  const subjects = useMemo(() => data ?? [], [data]);
  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  return { subjects, byId, loading, get: (id: string | null | undefined): Subject | null => (id ? (byId.get(id) ?? null) : null) };
}
