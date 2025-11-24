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

      // Get all form session logs for abandoned sessions
      let logsQuery = supabase
        .from("form_session_logs")
        .select("*")
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (organizationId && !isSystemAdmin) {
        logsQuery = logsQuery.eq("organization_id", organizationId);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      if (!logs || logs.length === 0) {
        return { summaries: [] };
      }

      // Group by session and find last event per session
      const sessionMap = new Map<string, any[]>();
      logs.forEach(log => {
        if (!sessionMap.has(log.session_id)) {
          sessionMap.set(log.session_id, []);
        }
        sessionMap.get(log.session_id)!.push(log);
      });

      // Find sessions that were abandoned (no submission_success)
      const abandonedSessions: Array<{
        sessionId: string;
        lastLog: any;
        wasCompleted: boolean;
      }> = [];

      sessionMap.forEach((sessionLogs, sessionId) => {
        const sortedLogs = sessionLogs.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const wasCompleted = sessionLogs.some(l => l.event_type === 'submission_success');
        const lastLog = sortedLogs[sortedLogs.length - 1];

        if (!wasCompleted && lastLog.current_question_id && lastLog.current_section_index !== null) {
          abandonedSessions.push({
            sessionId,
            lastLog,
            wasCompleted: false,
          });
        }
      });

      // Get unique entry IDs to fetch form information
      const entryIds = abandonedSessions
        .map(s => s.lastLog.entry_id)
        .filter(Boolean);

      const { data: entries } = await supabase
        .from("anamnes_entries")
        .select("id, form_id")
        .in("id", entryIds);

      const entryFormMap = new Map(entries?.map(e => [e.id, e.form_id]) || []);

      // Get form schemas
      const formIds = Array.from(new Set(entries?.map(e => e.form_id) || []));
      const { data: forms } = await supabase
        .from("anamnes_forms")
        .select("id, title, schema")
        .in("id", formIds);

      const formMap = new Map(forms?.map(f => [f.id, f]) || []);

      // Aggregate abandonment data by form and question
      const formAbandonments = new Map<string, Map<string, QuestionAbandonmentData>>();

      abandonedSessions.forEach(session => {
        const { lastLog } = session;
        const formId = lastLog.entry_id ? entryFormMap.get(lastLog.entry_id) : null;
        
        if (!formId) return;

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
          sessionId: session.sessionId,
          entryId: lastLog.entry_id,
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
