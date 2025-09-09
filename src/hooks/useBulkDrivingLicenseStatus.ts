/**
 * This hook efficiently fetches driving license examination statuses for multiple entries at once.
 * Instead of individual API calls per entry, it batches them into a single query to improve performance.
 * It returns a map of entry IDs to their examination status for easy lookup.
 */

import { useState, useEffect, useMemo } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { Database } from "@/integrations/supabase/types";
import { useOrganization } from "@clerk/clerk-react";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface DrivingLicenseStatusMap {
  [entryId: string]: {
    isCompleted: boolean;
    examination: DrivingLicenseExamination | null;
  };
}

interface BulkDrivingLicenseStatus {
  statusMap: DrivingLicenseStatusMap;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useBulkDrivingLicenseStatus = (entryIds: string[]): BulkDrivingLicenseStatus => {
  const [statusMap, setStatusMap] = useState<DrivingLicenseStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();

  const fetchBulkStatus = async () => {
    if (!supabase || entryIds.length === 0 || !organization?.id) {
      setStatusMap({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: examinations, error: fetchError } = await supabase
        .from('driving_license_examinations')
        .select('*')
        .eq('organization_id', organization.id)
        .in('entry_id', entryIds);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // Create a map from entry_id to examination status
      const newStatusMap: DrivingLicenseStatusMap = {};
      
      // Initialize all entries as not completed
      entryIds.forEach(entryId => {
        newStatusMap[entryId] = {
          isCompleted: false,
          examination: null
        };
      });

      // Update with actual examination data
      examinations?.forEach(examination => {
        const isCompleted = examination.examination_status === 'completed';
        newStatusMap[examination.entry_id] = {
          isCompleted,
          examination
        };
      });

      setStatusMap(newStatusMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching bulk driving license status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize entry IDs to avoid unnecessary refetches
  const memoizedEntryIds = useMemo(() => entryIds.sort(), [entryIds]);

  useEffect(() => {
    fetchBulkStatus();
  }, [memoizedEntryIds, supabase, organization?.id]);

  const refetch = () => {
    fetchBulkStatus();
  };

  return {
    statusMap,
    isLoading,
    error,
    refetch
  };
};

// Helper hook to get status for a specific entry
export const useDrivingLicenseStatusFromBulk = (entryId: string, statusMap: DrivingLicenseStatusMap) => {
  return useMemo(() => {
    const status = statusMap[entryId];
    return {
      isCompleted: status?.isCompleted || false,
      examination: status?.examination || null,
      isLoading: false,
      error: null
    };
  }, [entryId, statusMap]);
};