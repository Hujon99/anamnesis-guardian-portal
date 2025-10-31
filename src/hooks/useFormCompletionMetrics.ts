/**
 * Hook for fetching form completion metrics and analytics.
 * Combines data from anamnes_entries and form_attempt_reports to calculate
 * completion rates, failed attempts, and trends over time.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompletionMetrics {
  total_online_completions: number;
  total_store_creations: number;
  total_reported_attempts: number;
  estimated_completion_rate: number;
  store_creation_rate: number;
}

export interface CompletionTrend {
  date: string;
  completions: number;
  attempts: number;
  rate: number;
}

export interface FailureReason {
  reason: string;
  count: number;
  organizations?: string[];
}

interface UseFormCompletionMetricsParams {
  organizationId?: string;
  storeId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const useFormCompletionMetrics = ({
  organizationId,
  storeId,
  dateRange,
}: UseFormCompletionMetricsParams = {}) => {
  return useQuery({
    queryKey: ["form-completion-metrics", organizationId, storeId, dateRange],
    queryFn: async () => {
      // Build base queries with filters
      let entriesQuery = supabase
        .from("anamnes_entries")
        .select("id, is_magic_link, status, created_at, organization_id");

      let reportsQuery = supabase
        .from("form_attempt_reports")
        .select("id, customer_attempted_online, created_at, organization_id, failure_description");

      // Apply filters
      if (organizationId) {
        entriesQuery = entriesQuery.eq("organization_id", organizationId);
        reportsQuery = reportsQuery.eq("organization_id", organizationId);
      }

      if (storeId) {
        entriesQuery = entriesQuery.eq("store_id", storeId);
        reportsQuery = reportsQuery.eq("store_id", storeId);
      }

      if (dateRange) {
        entriesQuery = entriesQuery
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
        reportsQuery = reportsQuery
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      // Fetch data
      const [entriesResult, reportsResult] = await Promise.all([
        entriesQuery,
        reportsQuery,
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (reportsResult.error) throw reportsResult.error;

      const entries = entriesResult.data || [];
      const reports = reportsResult.data || [];

      // Calculate metrics
      const onlineCompletions = entries.filter(
        (e) => e.is_magic_link && ["ready", "journaled", "reviewed"].includes(e.status || "")
      ).length;

      const storeCreations = entries.filter((e) => !e.is_magic_link).length;

      const reportedAttempts = reports.filter(
        (r) => r.customer_attempted_online
      ).length;

      const totalAttempts = onlineCompletions + reportedAttempts;
      const completionRate = totalAttempts > 0
        ? Math.round((onlineCompletions / totalAttempts) * 10000) / 100
        : 0;

      const totalEntries = entries.length;
      const storeCreationRate = totalEntries > 0
        ? Math.round((storeCreations / totalEntries) * 10000) / 100
        : 0;

      const metrics: CompletionMetrics = {
        total_online_completions: onlineCompletions,
        total_store_creations: storeCreations,
        total_reported_attempts: reportedAttempts,
        estimated_completion_rate: completionRate,
        store_creation_rate: storeCreationRate,
      };

      // Calculate trends (daily for the last 30 days if no date range specified)
      const trendsMap = new Map<string, { completions: number; attempts: number }>();
      
      entries.forEach((entry) => {
        if (entry.is_magic_link && ["ready", "journaled", "reviewed"].includes(entry.status || "")) {
          const date = new Date(entry.created_at).toISOString().split("T")[0];
          const current = trendsMap.get(date) || { completions: 0, attempts: 0 };
          trendsMap.set(date, { ...current, completions: current.completions + 1 });
        }
      });

      reports.forEach((report) => {
        if (report.customer_attempted_online) {
          const date = new Date(report.created_at).toISOString().split("T")[0];
          const current = trendsMap.get(date) || { completions: 0, attempts: 0 };
          trendsMap.set(date, { ...current, attempts: current.attempts + 1 });
        }
      });

      const trends: CompletionTrend[] = Array.from(trendsMap.entries())
        .map(([date, data]) => ({
          date,
          completions: data.completions,
          attempts: data.attempts,
          rate: data.completions + data.attempts > 0
            ? Math.round((data.completions / (data.completions + data.attempts)) * 10000) / 100
            : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Extract failure reasons
      const failureReasons: FailureReason[] = reports
        .filter((r) => r.customer_attempted_online && r.failure_description)
        .reduce((acc, report) => {
          const reason = report.failure_description?.trim().toLowerCase() || "";
          if (!reason) return acc;

          const existing = acc.find((r) => r.reason === reason);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ reason, count: 1 });
          }
          return acc;
        }, [] as FailureReason[])
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        metrics,
        trends,
        failureReasons,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
