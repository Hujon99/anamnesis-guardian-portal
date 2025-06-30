
/**
 * This hook manages validation timing to prevent premature validation errors.
 * It tracks field interactions and determines when validation should be shown.
 */

import { useState, useCallback, useEffect } from 'react';

export interface ValidationTimingConfig {
  showValidationOnLoad?: boolean;
  showValidationOnBlur?: boolean;
  showValidationOnSubmit?: boolean;
  delayValidationMs?: number;
}

export const useValidationTiming = (config: ValidationTimingConfig = {}) => {
  const {
    showValidationOnLoad = false,
    showValidationOnBlur = true,
    showValidationOnSubmit = true,
    delayValidationMs = 0
  } = config;

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [blurredFields, setBlurredFields] = useState<Set<string>>(new Set());
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const [validationDelayTimers, setValidationDelayTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Mark a field as touched (user started interacting with it)
  const markFieldAsTouched = useCallback((fieldId: string) => {
    setTouchedFields(prev => new Set([...prev, fieldId]));
  }, []);

  // Mark a field as blurred (user left the field)
  const markFieldAsBlurred = useCallback((fieldId: string) => {
    setBlurredFields(prev => new Set([...prev, fieldId]));
    
    // If there's a delay configured, set a timer
    if (delayValidationMs > 0) {
      const timers = validationDelayTimers;
      
      // Clear existing timer for this field
      if (timers.has(fieldId)) {
        clearTimeout(timers.get(fieldId)!);
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        // Timer expired, validation can be shown
        timers.delete(fieldId);
        setValidationDelayTimers(new Map(timers));
      }, delayValidationMs);
      
      timers.set(fieldId, timer);
      setValidationDelayTimers(new Map(timers));
    }
  }, [delayValidationMs, validationDelayTimers]);

  // Mark that a submission was attempted
  const markSubmissionAttempted = useCallback(() => {
    setSubmissionAttempted(true);
  }, []);

  // Check if validation should be shown for a specific field
  const shouldShowValidation = useCallback((fieldId: string): boolean => {
    // Always show validation after submission attempt
    if (submissionAttempted && showValidationOnSubmit) {
      return true;
    }

    // Show validation on load if configured
    if (showValidationOnLoad) {
      return true;
    }

    // Show validation on blur if configured and field has been blurred
    if (showValidationOnBlur && blurredFields.has(fieldId)) {
      // Check if delay timer is still running
      if (delayValidationMs > 0 && validationDelayTimers.has(fieldId)) {
        return false;
      }
      return true;
    }

    return false;
  }, [submissionAttempted, showValidationOnLoad, showValidationOnBlur, showValidationOnSubmit, blurredFields, delayValidationMs, validationDelayTimers]);

  // Check if a field has been touched
  const isFieldTouched = useCallback((fieldId: string): boolean => {
    return touchedFields.has(fieldId);
  }, [touchedFields]);

  // Check if a field has been blurred
  const isFieldBlurred = useCallback((fieldId: string): boolean => {
    return blurredFields.has(fieldId);
  }, [blurredFields]);

  // Reset all validation state
  const resetValidationState = useCallback(() => {
    setTouchedFields(new Set());
    setBlurredFields(new Set());
    setSubmissionAttempted(false);
    
    // Clear all timers
    validationDelayTimers.forEach(timer => clearTimeout(timer));
    setValidationDelayTimers(new Map());
  }, [validationDelayTimers]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      validationDelayTimers.forEach(timer => clearTimeout(timer));
    };
  }, [validationDelayTimers]);

  return {
    markFieldAsTouched,
    markFieldAsBlurred,
    markSubmissionAttempted,
    shouldShowValidation,
    isFieldTouched,
    isFieldBlurred,
    resetValidationState,
    submissionAttempted
  };
};
