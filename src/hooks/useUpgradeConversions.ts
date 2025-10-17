/**
 * Hook for fetching and calculating upgrade conversion statistics.
 * 
 * This hook provides access to anonymized data about how many patients
 * accept upgrade offers in questionnaires, enabling business analytics
 * and ROI calculations for the organization.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { UpgradeStats, UpgradeStatsTimeRange } from "@/types/upgrade";
import { subWeeks, subMonths, subYears } from "date-fns";

export const useUpgradeConversions = (options?: UpgradeStatsTimeRange) => {
  const { timeRange = 'month', storeId } = options || {};
  const { supabase } = useSupabaseClient();

  return useQuery({
    queryKey: ['upgrade-conversions', timeRange, storeId],
    queryFn: async (): Promise<UpgradeStats> => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      let query = supabase
        .from('upgrade_conversions')
        .select('*');

      // Apply time range filter
      if (timeRange !== 'all') {
        let startDate: Date;
        switch (timeRange) {
          case 'week':
            startDate = subWeeks(new Date(), 1);
            break;
          case 'month':
            startDate = subMonths(new Date(), 1);
            break;
          case 'year':
            startDate = subYears(new Date(), 1);
            break;
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply store filter if provided
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const conversions = data || [];

      // Calculate statistics
      const total_offered = conversions.length;
      const total_accepted = conversions.filter(c => c.upgrade_accepted).length;
      const conversion_rate = total_offered > 0 
        ? (total_accepted / total_offered) * 100 
        : 0;

      // Group by store
      const by_store: Record<string, { offered: number; accepted: number; rate: number }> = {};
      conversions.forEach(conversion => {
        if (!conversion.store_id) return;
        
        if (!by_store[conversion.store_id]) {
          by_store[conversion.store_id] = { offered: 0, accepted: 0, rate: 0 };
        }
        
        by_store[conversion.store_id].offered++;
        if (conversion.upgrade_accepted) {
          by_store[conversion.store_id].accepted++;
        }
      });

      // Calculate rates for each store
      Object.keys(by_store).forEach(storeId => {
        const store = by_store[storeId];
        store.rate = store.offered > 0 ? (store.accepted / store.offered) * 100 : 0;
      });

      return {
        total_offered,
        total_accepted,
        conversion_rate,
        by_store: Object.keys(by_store).length > 0 ? by_store : undefined,
      };
    },
  });
};