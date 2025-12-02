/**
 * useJourneyTracking.ts
 * 
 * Purpose: Track the entire user journey through pre-form pages (consent, customer info, examination selection).
 * This hook creates a persistent journey_id that follows the user across all pages.
 * 
 * Usage:
 * - Initialize on each page with the page type
 * - Journey ID is persisted via URL params for cross-page tracking
 * - Logs page views, exits, and key user actions
 * 
 * This complements useFormSessionTracking which tracks activity within the form itself.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export type JourneyPageType = 
  | 'consent' 
  | 'customer_info' 
  | 'examination_selection' 
  | 'store_selection'
  | 'ciss_entry' 
  | 'ciss_customer_info'
  | 'form';

// Detect device information
const getDeviceInfo = () => ({
  device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) 
    ? 'mobile' 
    : /iPad|Tablet/i.test(navigator.userAgent) 
    ? 'tablet' 
    : 'desktop',
  browser: navigator.userAgent.substring(0, 200), // Truncate to avoid too long strings
  viewport_width: window.innerWidth,
  viewport_height: window.innerHeight,
  is_touch_device: 'ontouchstart' in window
});

interface JourneyTrackingProps {
  pageType: JourneyPageType;
  organizationId?: string | null;
  formId?: string | null;
  storeId?: string | null;
}

export const useJourneyTracking = ({
  pageType,
  organizationId,
  formId,
  storeId
}: JourneyTrackingProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const journeyIdRef = useRef<string | null>(null);
  const pageViewLoggedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  // Get or create journey_id from URL params
  useEffect(() => {
    const existingJourneyId = searchParams.get('journey_id');
    if (existingJourneyId) {
      journeyIdRef.current = existingJourneyId;
    } else {
      // Create new journey_id and add to URL
      const newJourneyId = uuidv4();
      journeyIdRef.current = newJourneyId;
      
      // Update URL params without navigation
      const newParams = new URLSearchParams(searchParams);
      newParams.set('journey_id', newJourneyId);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Log event to database
  const logEvent = useCallback(async (
    eventType: string,
    eventData: Record<string, any> = {}
  ) => {
    if (!journeyIdRef.current) return;

    try {
      // Extract URL params for context
      const urlParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key !== 'journey_id') {
          urlParams[key] = value;
        }
      });

      await supabase.from('journey_session_logs').insert({
        journey_id: journeyIdRef.current,
        organization_id: organizationId || null,
        form_id: formId || null,
        store_id: storeId || null,
        page_type: pageType,
        event_type: eventType,
        event_data: eventData,
        referrer: document.referrer || null,
        url_params: Object.keys(urlParams).length > 0 ? urlParams : null,
        ...getDeviceInfo()
      });
    } catch (error) {
      // Silent fail - we don't want to disrupt the user experience
      console.debug('Failed to log journey event:', error);
    }
  }, [organizationId, formId, storeId, pageType, searchParams]);

  // Log page view on mount
  useEffect(() => {
    if (journeyIdRef.current && !pageViewLoggedRef.current) {
      pageViewLoggedRef.current = true;
      startTimeRef.current = Date.now();
      logEvent('page_view', {
        timestamp: new Date().toISOString()
      });
    }
  }, [logEvent]);

  // Log page leave on unmount/close
  useEffect(() => {
    const handleUnload = () => {
      if (!journeyIdRef.current) return;

      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon to guarantee data is sent before page closes
      if (navigator.sendBeacon) {
        const data = {
          journey_id: journeyIdRef.current,
          organization_id: organizationId || null,
          form_id: formId || null,
          store_id: storeId || null,
          page_type: pageType,
          event_type: 'page_leave',
          event_data: { time_on_page_seconds: timeOnPage },
          ...getDeviceInfo(),
          created_at: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        
        navigator.sendBeacon(
          `${SUPABASE_URL}/rest/v1/journey_session_logs?apikey=${SUPABASE_PUBLISHABLE_KEY}`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [organizationId, formId, storeId, pageType]);

  return {
    journeyId: journeyIdRef.current,
    logEvent,
    
    // Helper methods for common events
    logConsentGiven: () => logEvent('consent_given', { timestamp: new Date().toISOString() }),
    logConsentDeclined: () => logEvent('consent_declined', { timestamp: new Date().toISOString() }),
    
    logCustomerInfoSubmitted: (data: { hasName: boolean; hasPersonalNumber: boolean; hasStore: boolean }) => 
      logEvent('customer_info_submitted', data),
    
    logExaminationSelected: (examinationType: string, selectedFormId: string) => 
      logEvent('examination_selected', { examination_type: examinationType, form_id: selectedFormId }),
    
    logStoreSelected: (selectedStoreId: string, storeName: string) =>
      logEvent('store_selected', { store_id: selectedStoreId, store_name: storeName }),
    
    logError: (errorMessage: string) => 
      logEvent('error', { error_message: errorMessage }),
    
    logNavigation: (destination: string) =>
      logEvent('navigation', { destination }),

    // Get journey_id to pass to next page
    getJourneyParams: () => {
      if (!journeyIdRef.current) return '';
      return `journey_id=${journeyIdRef.current}`;
    }
  };
};

/**
 * Helper to preserve journey_id when navigating between pages
 */
export const preserveJourneyId = (
  currentParams: URLSearchParams,
  newParams: URLSearchParams
) => {
  const journeyId = currentParams.get('journey_id');
  if (journeyId) {
    newParams.set('journey_id', journeyId);
  }
};
