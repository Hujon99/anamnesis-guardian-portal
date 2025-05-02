
/**
 * This hook selects between different form submission implementations.
 * It provides a unified interface for both patient and optician form submissions,
 * with improved error handling and state management.
 */

import { SubmissionMode, useUnifiedFormSubmission } from "@/hooks/useUnifiedFormSubmission";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { FormTemplateWithMeta } from "@/hooks/useFormTemplate";

// Re-export the SubmissionError type
export type { SubmissionError } from "@/hooks/useUnifiedFormSubmission";

interface FormSubmissionSelectorProps {
  token: string | null;
  mode: SubmissionMode;
  useUnifiedHook?: boolean;
}

export const useFormSubmissionSelector = ({
  token,
  mode,
  useUnifiedHook = true // Default to using the unified hook now
}: FormSubmissionSelectorProps) => {
  console.log(`[useFormSubmissionSelector]: Using ${useUnifiedHook ? 'unified' : 'legacy'} implementation for ${mode} mode`);
  
  // Use unified implementation (improved with direct database updates for opticians)
  const unifiedFormSubmission = useUnifiedFormSubmission({ token, mode });
  
  // Legacy implementation (kept for backwards compatibility)
  const legacyFormSubmission = useFormSubmission();

  // Choose which implementation to use
  const {
    isSubmitting,
    isSubmitted,
    error,
    submissionAttempts,
    submitForm: submissionHandler,
    retrySubmission,
    resetError
  } = useUnifiedHook ? unifiedFormSubmission : legacyFormSubmission;

  // Unified form submit handler that adapts to the selected implementation
  const handleFormSubmit = async (
    values: Record<string, any>,
    formTemplate: FormTemplateWithMeta | null,
    formattedAnswers?: any
  ) => {
    console.log(`[useFormSubmissionSelector/handleFormSubmit]: Using ${useUnifiedHook ? 'unified' : 'legacy'} implementation`);
    
    if (useUnifiedHook) {
      // Unified approach
      return await submissionHandler(values, formTemplate, formattedAnswers);
    } else {
      // Legacy approach
      if (!token) return false;
      // Fix type error by explicitly providing the right arguments in the correct order
      // The legacy submission expects token as string first, then values and other parameters
      return await legacyFormSubmission.submitForm(token as string, values, formTemplate?.schema, formattedAnswers);
    }
  };

  return {
    isSubmitting,
    isSubmitted,
    error,
    submissionAttempts,
    handleFormSubmit,
    handleRetrySubmission: retrySubmission,
    resetError
  };
};
