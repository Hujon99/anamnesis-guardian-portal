/**
 * Hook for fetching and analyzing failure reasons from form attempt reports.
 * Groups similar failure descriptions and provides insights for debugging.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FailureReason {
  reason: string;
  count: number;
  organizations?: string[];
  entries?: Array<{
    id: string;
    created_at: string;
    store_name?: string;
  }>;
}

interface UseFailureReasonsParams {
  organizationId?: string;
  storeId?: string;
  limit?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const useFailureReasons = ({
  organizationId,
  storeId,
  limit = 20,
  dateRange,
}: UseFailureReasonsParams = {}) => {
  return useQuery({
    queryKey: ["failure-reasons", organizationId, storeId, limit, dateRange],
    queryFn: async () => {
      // Build query
      let query = supabase
        .from("form_attempt_reports")
        .select(`
          id,
          customer_attempted_online,
          failure_description,
          created_at,
          organization_id,
          store_id,
          stores (
            name
          )
        `)
        .eq("customer_attempted_online", true)
        .not("failure_description", "is", null);

      // Apply filters
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Group by similar descriptions
      const reasonsMap = new Map<string, FailureReason>();

      data?.forEach((report: any) => {
        const description = report.failure_description?.trim().toLowerCase() || "";
        if (!description) return;

        // Try to find existing similar reason (exact match for now, could use fuzzy matching later)
        const existing = reasonsMap.get(description);

        if (existing) {
          existing.count++;
          if (!existing.entries) existing.entries = [];
          existing.entries.push({
            id: report.id,
            created_at: report.created_at,
            store_name: report.stores?.name,
          });
        } else {
          reasonsMap.set(description, {
            reason: report.failure_description.trim(),
            count: 1,
            entries: [
              {
                id: report.id,
                created_at: report.created_at,
                store_name: report.stores?.name,
              },
            ],
          });
        }
      });

      // Convert to array and sort by frequency
      const reasons = Array.from(reasonsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      // Calculate statistics
      const totalReports = data?.length || 0;
      const uniqueReasons = reasonsMap.size;
      const avgReasonLength =
        data?.reduce(
          (sum: number, r: any) => sum + (r.failure_description?.length || 0),
          0
        ) / (totalReports || 1);

      return {
        reasons,
        stats: {
          totalReports,
          uniqueReasons,
          avgReasonLength: Math.round(avgReasonLength),
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
