/**
 * Hook for analyzing where users abandon forms.
 * Aggregates abandonment data by question and section to identify problem areas.
 */

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";

export interface QuestionAbandonmentData {
  formId: string;
  formTitle: string;
  sectionIndex: number;
  sectionTitle: string;
  questionId: string;
  questionText: string;
  abandonmentCount: number;
  avgProgress: number;
  sessions: {
    sessionId: string;
    entryId: string | null;
    deviceType: string | null;
    lastActivity: string;
  }[];
}

export interface FormAbandonmentSummary {
  formId: string;
  formTitle: string;
  totalAbandoned: number;
  abandonmentsByQuestion: QuestionAbandonmentData[];
}

interface UseFormAbandonmentDataParams {
  organizationId?: string;
  days?: number;
}

export const useFormAbandonmentData = ({
  organizationId,
  days = 30,
}: UseFormAbandonmentDataParams = {}) => {
  const { supabase, isReady } = useSupabaseClient();
  const { isSystemAdmin } = useSystemAdmin();

  return useQuery({
    queryKey: ["form-abandonment-data", organizationId, days],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase client not ready");

      // Get entries with status 'sent' (abandoned) instead of relying on session logs
      let entriesQuery = supabase
        .from("anamnes_entries")
        .select("id, form_id, access_token, created_at")
        .eq("status", "sent")
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (organizationId && !isSystemAdmin) {
        entriesQuery = entriesQuery.eq("organization_id", organizationId);
      }

      const { data: entries, error: entriesError } = await entriesQuery;
      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        return { summaries: [] };
      }

      // Get session logs for these entries (match by entry_id OR token)
      const entryIds = entries.map(e => e.id);
      const tokens = entries.map(e => e.access_token).filter(Boolean);

      if (entryIds.length === 0) {
        return { summaries: [] };
      }

      let logsQuery = supabase
        .from("form_session_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Build OR condition for entry_id or token match
      if (tokens.length > 0) {
        logsQuery = logsQuery.or(`entry_id.in.(${entryIds.join(',')}),token.in.(${tokens.join(',')})`);
      } else {
        logsQuery = logsQuery.in("entry_id", entryIds);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Create a map to link tokens to entries
      const tokenToEntryMap = new Map(entries.map(e => [e.access_token, e]));
      const entryFormMap = new Map(entries.map(e => [e.id, e.form_id]));

      // Group logs by session
      const sessionMap = new Map<string, any[]>();
      (logs || []).forEach(log => {
        if (!sessionMap.has(log.session_id)) {
          sessionMap.set(log.session_id, []);
        }
        sessionMap.get(log.session_id)!.push(log);
      });

      // Find last meaningful log per entry (with position data)
      const entryAbandonmentMap = new Map<string, any>();

      // Process each entry
      entries.forEach(entry => {
        // Find logs for this entry (by entry_id or token)
        const entryLogs = (logs || []).filter(log => 
          log.entry_id === entry.id || log.token === entry.access_token
        );

        if (entryLogs.length === 0) return;

        // Sort by created_at
        const sortedLogs = entryLogs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Find the last log with position data (section and question)
        const lastLogWithPosition = sortedLogs.find(log => 
          log.current_section_index !== null && log.current_question_id
        );

        if (lastLogWithPosition) {
          entryAbandonmentMap.set(entry.id, {
            entry,
            lastLog: lastLogWithPosition,
            sessionId: lastLogWithPosition.session_id,
          });
        }
      });

      // Get form schemas
      const formIds = Array.from(new Set(entries.map(e => e.form_id)));
      const { data: forms } = await supabase
        .from("anamnes_forms")
        .select("id, title, schema")
        .in("id", formIds);

      const formMap = new Map(forms?.map(f => [f.id, f]) || []);

      // Aggregate abandonment data by form and question
      const formAbandonments = new Map<string, Map<string, QuestionAbandonmentData>>();

      entryAbandonmentMap.forEach(({ entry, lastLog, sessionId }) => {
        const formId = entry.form_id;
        const form = formMap.get(formId);
        if (!form) return;

        const schema = form.schema as any;
        const section = schema?.sections?.[lastLog.current_section_index];
        if (!section) return;

        const question = section.questions?.find((q: any) => q.id === lastLog.current_question_id);
        if (!question) return;

        const key = `${formId}`;
        if (!formAbandonments.has(key)) {
          formAbandonments.set(key, new Map());
        }

        const questionKey = `${lastLog.current_section_index}-${lastLog.current_question_id}`;
        const formQuestions = formAbandonments.get(key)!;

        if (!formQuestions.has(questionKey)) {
          formQuestions.set(questionKey, {
            formId,
            formTitle: form.title,
            sectionIndex: lastLog.current_section_index,
            sectionTitle: section.section_title || `Sektion ${lastLog.current_section_index + 1}`,
            questionId: lastLog.current_question_id,
            questionText: question.question_text || question.label || lastLog.current_question_id,
            abandonmentCount: 0,
            avgProgress: 0,
            sessions: [],
          });
        }

        const data = formQuestions.get(questionKey)!;
        data.abandonmentCount++;
        data.avgProgress = (data.avgProgress * (data.abandonmentCount - 1) + (lastLog.form_progress_percent || 0)) / data.abandonmentCount;
        data.sessions.push({
          sessionId,
          entryId: entry.id,
          deviceType: lastLog.device_type,
          lastActivity: lastLog.created_at,
        });
      });

      // Convert to array format
      const summaries: FormAbandonmentSummary[] = Array.from(formAbandonments.entries()).map(([formId, questions]) => {
        const questionArray = Array.from(questions.values()).sort((a, b) => b.abandonmentCount - a.abandonmentCount);
        return {
          formId,
          formTitle: questionArray[0]?.formTitle || 'Okänt formulär',
          totalAbandoned: questionArray.reduce((sum, q) => sum + q.abandonmentCount, 0),
          abandonmentsByQuestion: questionArray,
        };
      }).sort((a, b) => b.totalAbandoned - a.totalAbandoned);

      return { summaries };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: isReady,
  });
};
