/**
 * Hook for fetching and analyzing started but uncompleted forms.
 * Joins anamnes_entries with form_session_logs to provide detailed abandonment analysis.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";

export interface StartedFormEntry {
  id: string;
  first_name: string | null;
  patient_identifier: string | null;
  created_at: string;
  organization_id: string;
  form_id: string;
  form_title: string | null;
  store_id: string | null;
  examination_type: string | null;
  status: string | null;
  last_session_id: string | null;
  last_section_index: number | null;
  last_question_id: string | null;
  last_progress: number | null;
  last_activity: string | null;
  device_type: string | null;
  browser: string | null;
  is_touch_device: boolean | null;
}

interface UseStartedFormsDataParams {
  organizationId?: string;
  days?: number;
}

export const useStartedFormsData = ({
  organizationId,
  days = 30,
}: UseStartedFormsDataParams = {}) => {
  const { supabase, isReady } = useSupabaseClient();
  const { isSystemAdmin } = useSystemAdmin();

  return useQuery({
    queryKey: ["started-forms", organizationId, days],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase client not ready");

      // First get all started entries with form info
      let entriesQuery = supabase
        .from("anamnes_entries")
        .select(`
          *,
          anamnes_forms!inner(id, title)
        `)
        .eq("status", "sent")
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      // Filter by organization if not system admin
      if (organizationId && !isSystemAdmin) {
        entriesQuery = entriesQuery.eq("organization_id", organizationId);
      }

      const { data: entries, error: entriesError } = await entriesQuery;
      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        return {
          entries: [],
          stats: {
            total: 0,
            avgProgress: 0,
            mobileCount: 0,
            desktopCount: 0,
            tabletCount: 0,
          }
        };
      }

      // Get the latest session log for each entry (match by entry_id OR token)
      const entryIds = entries.map(e => e.id);
      const tokens = entries.map(e => (e as any).access_token).filter(Boolean);
      
      let logsQuery = supabase
        .from("form_session_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Build OR condition for entry_id or token match
      if (entryIds.length > 0 && tokens.length > 0) {
        logsQuery = logsQuery.or(`entry_id.in.(${entryIds.join(',')}),token.in.(${tokens.join(',')})`);
      } else if (entryIds.length > 0) {
        logsQuery = logsQuery.in("entry_id", entryIds);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Map logs to entries (get latest log per entry, match by entry_id OR token)
      const logsByEntry = new Map<string, any>();
      const tokenToEntryId = new Map(entries.map(e => [(e as any).access_token, e.id]));
      
      logs?.forEach(log => {
        // Try to find entry by entry_id first, then by token
        let entryId = log.entry_id;
        if (!entryId && log.token && tokenToEntryId.has(log.token)) {
          entryId = tokenToEntryId.get(log.token);
        }
        
        if (entryId && !logsByEntry.has(entryId)) {
          logsByEntry.set(entryId, log);
        }
      });

      // Combine data
      const startedForms: StartedFormEntry[] = entries.map(entry => {
        const lastLog = logsByEntry.get(entry.id);
        const formInfo = (entry as any).anamnes_forms;
        return {
          id: entry.id,
          first_name: entry.first_name,
          patient_identifier: entry.patient_identifier,
          created_at: entry.created_at,
          organization_id: entry.organization_id,
          form_id: entry.form_id,
          form_title: formInfo?.title || null,
          store_id: entry.store_id,
          examination_type: entry.examination_type,
          status: entry.status,
          last_session_id: lastLog?.session_id || null,
          last_section_index: lastLog?.current_section_index || null,
          last_question_id: lastLog?.current_question_id || null,
          last_progress: lastLog?.form_progress_percent || null,
          last_activity: lastLog?.created_at || entry.created_at,
          device_type: lastLog?.device_type || null,
          browser: lastLog?.browser || null,
          is_touch_device: lastLog?.is_touch_device || null,
        };
      });

      // Calculate stats
      const total = startedForms.length;
      const progressValues = startedForms.filter(f => f.last_progress !== null).map(f => f.last_progress!);
      const avgProgress = progressValues.length > 0
        ? Math.round(progressValues.reduce((sum, p) => sum + p, 0) / progressValues.length)
        : 0;

      const mobileCount = startedForms.filter(f => f.device_type === 'mobile').length;
      const desktopCount = startedForms.filter(f => f.device_type === 'desktop').length;
      const tabletCount = startedForms.filter(f => f.device_type === 'tablet').length;

      return {
        entries: startedForms,
        stats: {
          total,
          avgProgress,
          mobileCount,
          desktopCount,
          tabletCount,
        }
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: isReady,
  });
};
