
/**
 * This hook selects the appropriate form submission hook based on configuration.
 * It serves as a compatibility layer during the transition from the legacy hooks
 * to the new unified hook, allowing gradual migration of components.
 */

import { useFormSubmission, SubmissionError as LegacySubmissionError } from './useFormSubmission';
import { useFormSubmissionManager, SubmissionMode } from './useFormSubmissionManager';
import { useUnifiedFormSubmission, SubmissionError as UnifiedSubmissionError } from './useUnifiedFormSubmission';

// Re-export the submission error type for compatibility
export type SubmissionError = UnifiedSubmissionError;

// Define configuration options
export interface FormSubmissionSelectorOptions {
  token: string | null;
  mode: SubmissionMode;
  useUnifiedHook?: boolean; // Toggle to use the new unified hook
}

// Common interface that both legacy and unified hooks will conform to
export interface FormSubmissionInterface {
  isSubmitting: boolean;
  isSubmitted: boolean;
  error: SubmissionError | null;
  submissionAttempts: number;
  handleFormSubmit: (values: Record<string, any>, formTemplate: any, formattedAnswers?: any) => Promise<boolean>;
  handleRetrySubmission: () => Promise<boolean>;
  resetError: () => void;
}

export function useFormSubmissionSelector({
  token,
  mode,
  useUnifiedHook = true // Default to using the unified hook
}: FormSubmissionSelectorOptions): FormSubmissionInterface {
  // Use the new unified hook if enabled
  const unifiedHook = useUnifiedFormSubmission({ token, mode });
  
  // For backward compatibility, also initialize the legacy hooks
  const patientSubmission = useFormSubmission();
  const {
    isSubmitting: managerIsSubmitting,
    submissionError: managerError,
    isSubmitted: managerIsSubmitted,
    submissionAttempts: managerAttempts,
    handleFormSubmit: managerSubmit,
    handleRetrySubmission: managerRetry,
    resetError: managerResetError
  } = useFormSubmissionManager({ token, mode });
  
  // Return the appropriate hook based on configuration
  if (useUnifiedHook) {
    return {
      isSubmitting: unifiedHook.isSubmitting,
      isSubmitted: unifiedHook.isSubmitted,
      error: unifiedHook.error,
      submissionAttempts: unifiedHook.submissionAttempts,
      handleFormSubmit: unifiedHook.submitForm,
      handleRetrySubmission: unifiedHook.retrySubmission,
      resetError: unifiedHook.resetError
    };
  } else {
    // Use the legacy hooks (the existing pattern)
    return {
      isSubmitting: mode === 'patient' ? patientSubmission.isSubmitting : managerIsSubmitting,
      isSubmitted: mode === 'patient' ? patientSubmission.isSubmitted : managerIsSubmitted,
      error: mode === 'patient' ? patientSubmission.error : managerError,
      submissionAttempts: mode === 'patient' ? patientSubmission.submissionAttempts : managerAttempts,
      handleFormSubmit: managerSubmit,
      handleRetrySubmission: managerRetry,
      resetError: managerResetError
    };
  }
}
