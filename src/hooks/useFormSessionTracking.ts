/**
 * This hook tracks user form sessions for debugging purposes.
 * It logs critical events during the form-filling journey including:
 * - Form load/unload
 * - Section navigation
 * - Submission attempts and results
 * - Device and browser information
 * - Errors that occur during the process
 * 
 * All logging is done silently to not disrupt the user experience.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Detect device information
const getDeviceInfo = () => ({
  device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) 
    ? 'mobile' 
    : /iPad|Tablet/i.test(navigator.userAgent) 
    ? 'tablet' 
    : 'desktop',
  browser: navigator.userAgent,
  viewport_width: window.innerWidth,
  viewport_height: window.innerHeight,
  is_touch_device: 'ontouchstart' in window
});

interface FormSessionTrackingProps {
  entryId?: string | null;
  organizationId: string;
  token?: string | null;
}

export const useFormSessionTracking = ({
  entryId,
  organizationId,
  token
}: FormSessionTrackingProps) => {
  const { supabase } = useSupabaseClient();
  const sessionIdRef = useRef<string>(uuidv4());
  
  const logEvent = useCallback(async (
    eventType: string,
    eventData: Record<string, any> = {},
    errorInfo?: { message: string; type: string }
  ) => {
    if (!supabase) return;
    
    try {
      await supabase.from('form_session_logs').insert({
        session_id: sessionIdRef.current,
        entry_id: entryId || null,
        token: token || null,
        organization_id: organizationId,
        event_type: eventType,
        event_data: eventData,
        current_section_index: eventData.current_section_index,
        current_question_id: eventData.current_question_id,
        form_progress_percent: eventData.form_progress_percent,
        error_message: errorInfo?.message,
        error_type: errorInfo?.type,
        ...getDeviceInfo()
      });
    } catch (error) {
      // Silent fail - we don't want to disrupt the user experience
      console.debug('Failed to log form event:', error);
    }
  }, [supabase, entryId, organizationId, token]);
  
  // 1. Log form load
  useEffect(() => {
    logEvent('form_loaded', { 
      timestamp: new Date().toISOString() 
    });
    
    // 5. Log page unload (abandonment)
    const handleUnload = () => {
      // Use sendBeacon to guarantee data is sent before page closes
      if (navigator.sendBeacon && supabase) {
        const data = {
          session_id: sessionIdRef.current,
          entry_id: entryId || null,
          token: token || null,
          organization_id: organizationId,
          event_type: 'page_unload',
          event_data: {},
          ...getDeviceInfo(),
          created_at: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        
        navigator.sendBeacon(
          `${SUPABASE_URL}/rest/v1/form_session_logs`,
          blob
        );
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [logEvent, supabase, entryId, token, organizationId]);
  
  return {
    sessionId: sessionIdRef.current,
    logEvent,
    
    // Helper methods for common events
    logSectionChange: (sectionIndex: number, questionId: string | undefined, progress: number) => 
      logEvent('section_changed', { 
        current_section_index: sectionIndex,
        current_question_id: questionId || 'unknown',
        form_progress_percent: progress 
      }),
    
    logNavigation: (direction: 'next' | 'previous', fromIndex: number, toIndex: number, fromQuestionId: string, toQuestionId: string, progress: number) =>
      logEvent('navigation', {
        direction,
        from_index: fromIndex,
        to_index: toIndex,
        from_question_id: fromQuestionId,
        to_question_id: toQuestionId,
        form_progress_percent: progress
      }),
      
    logSubmissionAttempt: (progress: number) =>
      logEvent('submission_attempt', { form_progress_percent: progress }),
      
    logSubmissionSuccess: () =>
      logEvent('submission_success', { form_progress_percent: 100 }),
      
    logSubmissionError: (errorMessage: string, errorType: string) =>
      logEvent('submission_error', {}, { message: errorMessage, type: errorType })
  };
};
