/**
 * This hook provides optimistic updates for anamnesis entries to improve user experience.
 * It updates the UI immediately while the actual API call happens in the background,
 * reducing perceived loading times and providing instant feedback.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { AnamnesesEntry } from "@/types/anamnesis";

export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  const optimisticUpdateEntry = (
    entryId: string, 
    updates: Partial<AnamnesesEntry>,
    onError?: () => void
  ) => {
    if (!organization?.id) return;

    // Store the previous state for rollback
    const previousEntries = queryClient.getQueryData<AnamnesesEntry[]>([
      "anamnes-entries-all", 
      organization.id
    ]);

    // Optimistically update the cache
    queryClient.setQueryData<AnamnesesEntry[]>(
      ["anamnes-entries-all", organization.id],
      (oldData = []) => {
        return oldData.map(entry =>
          entry.id === entryId
            ? { ...entry, ...updates }
            : entry
        );
      }
    );

    // Return rollback function
    return () => {
      if (previousEntries) {
        queryClient.setQueryData(
          ["anamnes-entries-all", organization.id],
          previousEntries
        );
      }
      onError?.();
    };
  };

  const optimisticStatusUpdate = (entryId: string, newStatus: string) => {
    return optimisticUpdateEntry(entryId, { status: newStatus });
  };

  const optimisticOpticianAssignment = (entryId: string, opticianId: string | null) => {
    return optimisticUpdateEntry(entryId, { optician_id: opticianId });
  };

  const optimisticStoreAssignment = (entryId: string, storeId: string | null) => {
    return optimisticUpdateEntry(entryId, { store_id: storeId });
  };

  const optimisticDrivingLicenseUpdate = (
    entryId: string, 
    isCompleted: boolean, 
    examination: any = null
  ) => {
    return optimisticUpdateEntry(entryId, {
      driving_license_status: {
        isCompleted,
        examination
      }
    });
  };

  return {
    optimisticUpdateEntry,
    optimisticStatusUpdate,
    optimisticOpticianAssignment,
    optimisticStoreAssignment,
    optimisticDrivingLicenseUpdate,
  };
};