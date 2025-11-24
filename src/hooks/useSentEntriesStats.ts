/**
 * Hook for fetching statistics about old 'sent' status entries.
 * Only accessible by system administrators for debugging purposes.
 * Provides monthly aggregates and identifies common abandonment points.
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from './useSupabaseClient';
import { format, startOfMonth, subMonths } from 'date-fns';

interface MonthlyStats {
  month: string;
  count: number;
  avgAge: number; // in days
}

interface AbandonmentPoint {
  questionId: string;
  questionText: string;
  count: number;
  formTitle: string;
}

interface SentEntriesStatsData {
  monthlyStats: MonthlyStats[];
  abandonmentPoints: AbandonmentPoint[];
  totalEntries: number;
  averageAge: number;
  oldestEntry: string | null;
}

export const useSentEntriesStats = () => {
  const { supabase, isReady } = useSupabaseClient();

  return useQuery({
    queryKey: ['sent-entries-stats'],
    queryFn: async (): Promise<SentEntriesStatsData> => {
      // Fetch all 'sent' entries (system admins can see all via RLS)
      const { data: sentEntries, error: entriesError } = await supabase
        .from('anamnes_entries')
        .select('id, created_at, form_id')
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      // Calculate monthly stats
      const monthlyMap = new Map<string, { count: number; totalAge: number }>();
      const now = new Date();
      
      sentEntries?.forEach(entry => {
        const entryDate = new Date(entry.created_at);
        const monthKey = format(startOfMonth(entryDate), 'yyyy-MM');
        const ageInDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const existing = monthlyMap.get(monthKey) || { count: 0, totalAge: 0 };
        monthlyMap.set(monthKey, {
          count: existing.count + 1,
          totalAge: existing.totalAge + ageInDays
        });
      });

      const monthlyStats: MonthlyStats[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          count: data.count,
          avgAge: Math.round(data.totalAge / data.count)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Fetch session logs for sent entries to find abandonment points
      const entryIds = sentEntries?.map(e => e.id) || [];
      
      const { data: sessionLogs, error: logsError } = await supabase
        .from('form_session_logs')
        .select('entry_id, current_question_id, event_type')
        .in('entry_id', entryIds.slice(0, 1000)) // Limit to avoid timeout
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Find last interaction per entry
      const lastInteractions = new Map<string, string>();
      sessionLogs?.forEach(log => {
        if (log.entry_id && log.current_question_id && !lastInteractions.has(log.entry_id)) {
          lastInteractions.set(log.entry_id, log.current_question_id);
        }
      });

      // Count question occurrences
      const questionCounts = new Map<string, number>();
      lastInteractions.forEach(questionId => {
        questionCounts.set(questionId, (questionCounts.get(questionId) || 0) + 1);
      });

      // Get form schemas to resolve question text
      const formIds = [...new Set(sentEntries?.map(e => e.form_id) || [])];
      const { data: forms, error: formsError } = await supabase
        .from('anamnes_forms')
        .select('id, title, schema')
        .in('id', formIds);

      if (formsError) throw formsError;

      // Build question lookup
      const questionLookup = new Map<string, { text: string; formTitle: string }>();
      forms?.forEach(form => {
        const schema = form.schema as any;
        schema?.sections?.forEach((section: any) => {
          section?.questions?.forEach((question: any) => {
            if (question.id) {
              questionLookup.set(question.id, {
                text: question.text || question.label || 'Okänd fråga',
                formTitle: form.title
              });
            }
          });
        });
      });

      // Build abandonment points with top 10
      const abandonmentPoints: AbandonmentPoint[] = Array.from(questionCounts.entries())
        .map(([questionId, count]) => {
          const info = questionLookup.get(questionId) || { text: questionId, formTitle: 'Okänt formulär' };
          return {
            questionId,
            questionText: info.text,
            count,
            formTitle: info.formTitle
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate overall stats
      const totalAge = sentEntries?.reduce((sum, entry) => {
        const ageInDays = Math.floor((now.getTime() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return sum + ageInDays;
      }, 0) || 0;

      const averageAge = sentEntries?.length ? Math.round(totalAge / sentEntries.length) : 0;
      const oldestEntry = sentEntries?.length ? sentEntries[sentEntries.length - 1].created_at : null;

      return {
        monthlyStats,
        abandonmentPoints,
        totalEntries: sentEntries?.length || 0,
        averageAge,
        oldestEntry
      };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
