/**
 * This hook provides access to anamnesis entries that have no store_id assigned.
 * It's used primarily for handling legacy entries or entries created before the
 * multi-store system was fully implemented.
 */

import { useMemo } from "react";
import { useAnamnesisList } from "./useAnamnesisList";
import { AnamnesesEntry } from "@/types/anamnesis";

export function useEntriesWithoutStore() {
  const { entries, isLoading, error, refetch, isFetching } = useAnamnesisList();

  // Filter entries where store_id is null
  const entriesWithoutStore = useMemo(() => {
    return entries.filter((entry: AnamnesesEntry) => !entry.store_id);
  }, [entries]);

  return {
    entriesWithoutStore,
    count: entriesWithoutStore.length,
    isLoading,
    error,
    refetch,
    isFetching
  };
}
