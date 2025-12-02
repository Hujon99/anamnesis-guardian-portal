/**
 * useJourneyData.ts
 * 
 * Purpose: Fetch and analyze journey session data for the admin panel.
 * This hook provides statistics and details about user journeys through pre-form pages,
 * helping identify where users drop off before reaching the actual form.
 * 
 * Used by StartedFormsAnalysis component to show funnel visualization.
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from './useSupabaseClient';

interface JourneyStats {
  totalJourneys: number;
  consentPageViews: number;
  consentCompleted: number;
  customerInfoViews: number;
  customerInfoCompleted: number;
  examinationSelectionViews: number;
  examinationSelectionCompleted: number;
  formStarted: number;
  
  // Conversion rates
  consentConversionRate: number;
  customerInfoConversionRate: number;
  examinationConversionRate: number;
  overallConversionRate: number;
  
  // Device breakdown
  mobileCount: number;
  desktopCount: number;
  tabletCount: number;
}

interface JourneyEntry {
  journey_id: string;
  page_type: string;
  event_type: string;
  created_at: string;
  device_type: string | null;
  organization_id: string | null;
  form_id: string | null;
  store_id: string | null;
  url_params: Record<string, string> | null;
}

interface JourneyDropoff {
  journey_id: string;
  last_page: string;
  last_event: string;
  last_activity: string;
  device_type: string | null;
  time_spent_seconds: number;
  url_params: Record<string, string> | null;
}

interface UseJourneyDataOptions {
  organizationId?: string;
  days?: number;
}

export const useJourneyData = ({ organizationId, days = 30 }: UseJourneyDataOptions) => {
  const { supabase } = useSupabaseClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['journey-data', organizationId, days],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not ready');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build query
      let query = supabase
        .from('journey_session_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      // Group by journey_id
      const journeyMap = new Map<string, JourneyEntry[]>();
      (logs || []).forEach((log: any) => {
        const existing = journeyMap.get(log.journey_id) || [];
        existing.push(log);
        journeyMap.set(log.journey_id, existing);
      });

      // Calculate stats
      let consentPageViews = 0;
      let consentCompleted = 0;
      let customerInfoViews = 0;
      let customerInfoCompleted = 0;
      let examinationSelectionViews = 0;
      let examinationSelectionCompleted = 0;
      let formStarted = 0;
      let mobileCount = 0;
      let desktopCount = 0;
      let tabletCount = 0;

      const dropoffs: JourneyDropoff[] = [];

      journeyMap.forEach((events, journeyId) => {
        // Sort events by time
        const sortedEvents = events.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const pageTypes = new Set(events.map(e => e.page_type));
        const eventTypes = new Set(events.map(e => e.event_type));
        const deviceType = events[0]?.device_type;

        // Count device types
        if (deviceType === 'mobile') mobileCount++;
        else if (deviceType === 'tablet') tabletCount++;
        else desktopCount++;

        // Count page views and completions
        if (pageTypes.has('consent')) {
          consentPageViews++;
          if (eventTypes.has('consent_given') || pageTypes.has('customer_info')) {
            consentCompleted++;
          }
        }

        if (pageTypes.has('customer_info')) {
          customerInfoViews++;
          if (eventTypes.has('customer_info_submitted') || pageTypes.has('examination_selection')) {
            customerInfoCompleted++;
          }
        }

        if (pageTypes.has('examination_selection')) {
          examinationSelectionViews++;
          if (eventTypes.has('examination_selected') || pageTypes.has('form')) {
            examinationSelectionCompleted++;
          }
        }

        if (pageTypes.has('form')) {
          formStarted++;
        }

        // Identify dropoffs (journeys that didn't complete)
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        const firstEvent = sortedEvents[0];
        const reachedForm = pageTypes.has('form');

        if (!reachedForm && lastEvent) {
          const timeSpent = (new Date(lastEvent.created_at).getTime() - new Date(firstEvent.created_at).getTime()) / 1000;
          dropoffs.push({
            journey_id: journeyId,
            last_page: lastEvent.page_type,
            last_event: lastEvent.event_type,
            last_activity: lastEvent.created_at,
            device_type: deviceType,
            time_spent_seconds: timeSpent,
            url_params: lastEvent.url_params
          });
        }
      });

      const totalJourneys = journeyMap.size;

      const stats: JourneyStats = {
        totalJourneys,
        consentPageViews,
        consentCompleted,
        customerInfoViews,
        customerInfoCompleted,
        examinationSelectionViews,
        examinationSelectionCompleted,
        formStarted,
        
        consentConversionRate: consentPageViews > 0 ? Math.round((consentCompleted / consentPageViews) * 100) : 0,
        customerInfoConversionRate: customerInfoViews > 0 ? Math.round((customerInfoCompleted / customerInfoViews) * 100) : 0,
        examinationConversionRate: examinationSelectionViews > 0 ? Math.round((examinationSelectionCompleted / examinationSelectionViews) * 100) : 0,
        overallConversionRate: totalJourneys > 0 ? Math.round((formStarted / totalJourneys) * 100) : 0,
        
        mobileCount,
        desktopCount,
        tabletCount
      };

      return {
        stats,
        dropoffs: dropoffs.sort((a, b) => 
          new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        )
      };
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: data?.stats,
    dropoffs: data?.dropoffs || [],
    isLoading,
    error,
    refetch
  };
};
