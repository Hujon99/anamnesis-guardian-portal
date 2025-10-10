/**
 * This context provides form state and functions for all form components.
 * It manages the multi-step form flow, validation, and submission process.
 * Enhanced to support form values change events for auto-save functionality.
 * Enhanced with better error handling and detailed logging for debugging.
 * Now supports dynamic validation based on field visibility and direct step navigation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTemplate, FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useConditionalFields } from "@/hooks/useConditionalFields";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";
import { useDebouncedWatch } from "@/hooks/useDebouncedWatch";
import { toast } from "sonner";
import { CURRENT_PRIVACY_POLICY_VERSION, CURRENT_TERMS_VERSION } from '@/legal';

interface FormSessionTracking {
  logSectionChange: (sectionIndex: number, questionId: string | undefined, progress: number) => void;
  logSubmissionAttempt: (progress: number) => void;
  logSubmissionSuccess: () => void;
  logSubmissionError: (errorMessage: string, errorType: string) => void;
}

interface FormContextProviderProps {
  children: React.ReactNode;
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: Record<string, any> | null;
  isOpticianMode?: boolean;
  onFormValuesChange?: (values: Record<string, any>) => void;
  tracking?: FormSessionTracking;
}

interface FormContextValue {
  form: any;
  formTemplate: FormTemplate;
  watchedValues: Record<string, any>;
  visibleSections: any[];
  currentStep: number;
  totalSections: number;
  progress: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  isOpticianMode: boolean;
  completedSteps: number[];
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => Promise<boolean>;
  canNavigateToStep: (step: number) => boolean;
  handleSubmit: () => (data: any) => Promise<void>;
  processSectionsWithDebounce?: (sections: any[], values: Record<string, any>) => void;
  visibleFieldIds?: string[];
  
  // Legal consent
  consentGiven: boolean;
  onConsentChange: (consent: boolean) => void;
  showConsentStep: boolean;
  setShowConsentStep: (show: boolean) => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const FormContextProvider: React.FC<FormContextProviderProps> = ({
  children,
  formTemplate,
  onSubmit,
  isSubmitting,
  initialValues = null,
  isOpticianMode = false,
  onFormValuesChange,
  tracking
}) => {
  // Use state for form values that will be watched
  const [watchedFormValues, setWatchedFormValues] = useState<Record<string, any>>(initialValues || {});
  
  // Add state to track completed steps
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Legal consent is now handled on ConsentPage, so always true in form
  const [consentGiven] = useState(true);
  const [showConsentStep] = useState(false);
  
  // Create the form with React Hook Form
  const form = useForm({
    defaultValues: initialValues || {},
    mode: "onTouched"
  });

  // Get the form values - use IMMEDIATE values for conditional logic (not debounced)
  // This ensures follow-up questions appear instantly when parent values change
  const immediateValues = form.watch();
  
  // Setup conditional fields logic with IMMEDIATE values
  const { visibleSections } = useConditionalFields(formTemplate, immediateValues, isOpticianMode);
  
  // Get all visible field IDs for validation
  const visibleFieldIds = useMemo(() => {
    return visibleSections.flatMap(stepSections => 
      stepSections.flatMap(section => 
        section.questions.map(q => 
          // Handle both regular FormQuestion and DynamicFollowupQuestion types
          'runtimeId' in q ? (q as DynamicFollowupQuestion).runtimeId : q.id
        )
      )
    );
  }, [visibleSections]);

  // Setup form validation
  const { validateForm } = useFormValidation();
  
  // Get debounced values for auto-save (to reduce API calls)
  const watchedValues = useDebouncedWatch(form.watch, 300);
  
  // Log form value changes for debugging
  useEffect(() => {
    console.log('[FormContext]: Form values changed:', immediateValues);
  }, [immediateValues]);
  
  // Update our local state when form values change and store metadata for dynamic questions
  useEffect(() => {
    // Create a copy to add metadata
    const valuesWithMetadata = { ...watchedValues };
    
    // For each dynamic follow-up question in visible sections, store its full parent value as metadata
    visibleSections.forEach(stepSections => {
      stepSections.forEach(section => {
        section.questions.forEach(q => {
          if ('runtimeId' in q && 'parentValue' in q) {
            const dynamicQ = q as DynamicFollowupQuestion;
            const metadataKey = `_meta_parentValue_${dynamicQ.runtimeId}`;
            valuesWithMetadata[metadataKey] = dynamicQ.parentValue;
          }
        });
      });
    });
    
    setWatchedFormValues(valuesWithMetadata);
  }, [watchedValues, visibleSections]);
  
  // Call onFormValuesChange when form values change - use immediate values for auto-save
  useEffect(() => {
    if (onFormValuesChange) {
      onFormValuesChange(immediateValues);
    }
  }, [immediateValues, onFormValuesChange]);

  // Setup multi-step form navigation
  const multiStepForm = useMultiStepForm({ 
    totalSteps: visibleSections.length, 
    initialStep: 0 
  });
  
  const {
    currentStep,
    nextStep: goToNextStep,
    previousStep: goToPreviousStep,
    goToStep: directGoToStep,
    isFirstStep,
    isLastStep,
  } = multiStepForm;
  
  const totalSections = visibleSections.length;
  const progress = multiStepForm.calculateProgress();

  // Format answers for submission
  const { formatAnswersForSubmission } = useFormattedRawData();
  
  // Define a stub for processSectionsWithDebounce to satisfy the interface
  const processSectionsWithDebounce = useCallback((sections: any[], values: Record<string, any>) => {
    // Stub implementation for future debounced validation
  }, []);
  
  // Enhanced form submission handler with better error handling and debugging
  const handleFormSubmit = () => async (data: any) => {
    tracking?.logSubmissionAttempt(100);
    
    try {
      // Validate only visible fields
      const isValid = await form.trigger(visibleFieldIds);
      
      if (!isValid) {
        const errors = form.formState.errors;
        const visibleErrors = Object.entries(errors)
          .filter(([fieldId]) => visibleFieldIds.includes(fieldId))
          .map(([fieldId, error]) => ({ fieldId, message: (error as any)?.message }));
        
        if (visibleErrors.length > 0) {
          toast.error("Formuläret innehåller fel som måste åtgärdas");
          tracking?.logSubmissionError("Validation errors present", "ValidationError");
          return;
        }
      }
      
      const formattedAnswers = formatAnswersForSubmission(data, formTemplate, isOpticianMode);
      
      // Add consent metadata to submission data
      const submissionData = {
        ...data,
        consent_given: consentGiven,
        privacy_policy_version: CURRENT_PRIVACY_POLICY_VERSION,
        terms_version: CURRENT_TERMS_VERSION
      };
      
      // Add circuit breaker
      const submissionTimeout = setTimeout(() => {
        console.warn("[FormContext/handleFormSubmit]: Submission is taking too long, may be stuck");
      }, 10000);
      
      try {
        await onSubmit(submissionData, formattedAnswers);
        console.log("[FormContext/handleFormSubmit]: Form submitted successfully");
        tracking?.logSubmissionSuccess();
        clearTimeout(submissionTimeout);
      } catch (error) {
        clearTimeout(submissionTimeout);
        console.error("[FormContext/handleFormSubmit]: Error submitting form:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        tracking?.logSubmissionError(errorMessage, error instanceof Error ? error.constructor.name : 'UnknownError');
        toast.error("Det gick inte att skicka in formuläret");
        throw error;
      }
    } catch (error) {
      console.error("[FormContext/handleFormSubmit]: Error formatting answers:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      tracking?.logSubmissionError(errorMessage, 'FormattingError');
      toast.error("Ett fel uppstod vid formatering av svaren");
      throw error;
    }
  };

  // Check if we can navigate to a specific step
  const canNavigateToStep = (targetStep: number): boolean => {
    // Always allow navigation to previous steps
    if (targetStep < currentStep) return true;
    
    // Allow navigation to current step
    if (targetStep === currentStep) return true;
    
    // For future steps, check if all previous steps are completed
    for (let i = currentStep; i < targetStep; i++) {
      if (!completedSteps.includes(i)) {
        return false;
      }
    }
    
    return true;
  };

  // Enhanced go to step with validation
  const goToStep = async (targetStep: number): Promise<boolean> => {
    if (!canNavigateToStep(targetStep)) {
      return false;
    }
    
    // If going forward, validate current step first
    if (targetStep > currentStep) {
      const fields = getFieldsForCurrentStep();
      const visibleFields = fields.filter(fieldId => visibleFieldIds.includes(fieldId));
      
      try {
        const isValid = await form.trigger(visibleFields);
        if (!isValid) {
          return false;
        }
        // Mark current step as completed
        setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      } catch (error) {
        console.error("[FormContext/goToStep]: Error during validation:", error);
        return false;
      }
    }
    
    return directGoToStep(targetStep);
  };

  // Next and Previous step handlers
  const nextStep = async () => {
    const fields = getFieldsForCurrentStep();
    
    try {
      const visibleFields = fields.filter(fieldId => visibleFieldIds.includes(fieldId));
      
      const isValid = await form.trigger(visibleFields);
      if (isValid) {
        setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
        const nextSectionIndex = currentStep + 1;
        const nextSection = visibleSections[nextSectionIndex];
        const firstQuestionId = nextSection?.[0]?.questions?.[0]?.id;
        const progressPercent = Math.round(((nextSectionIndex + 1) / totalSections) * 100);
        
        tracking?.logSectionChange(nextSectionIndex, firstQuestionId, progressPercent);
        goToNextStep();
      } else {
        toast.error("Vänligen åtgärda felen innan du fortsätter");
      }
    } catch (error) {
      console.error("[FormContext/nextStep]: Error during validation:", error);
    }
  };
  
  const previousStep = () => {
    const prevSectionIndex = currentStep - 1;
    const prevSection = visibleSections[prevSectionIndex];
    const firstQuestionId = prevSection?.[0]?.questions?.[0]?.id;
    const progressPercent = Math.round(((prevSectionIndex + 1) / totalSections) * 100);
    
    tracking?.logSectionChange(prevSectionIndex, firstQuestionId, progressPercent);
    goToPreviousStep();
  };
  
  // Helper to get fields for the current step
  const getFieldsForCurrentStep = (): string[] => {
    if (!visibleSections[currentStep]) return [];
    
    return visibleSections[currentStep].flatMap((section: any) => {
      if (!section.questions) return [];
      return section.questions.map((q: any) => 
        // Handle both regular FormQuestion and DynamicFollowupQuestion types
        'runtimeId' in q ? q.runtimeId : q.id
      );
    });
  };


  return (
    <FormContext.Provider
      value={{
        form,
        formTemplate,
        watchedValues,
        visibleSections,
        currentStep,
        totalSections,
        progress,
        isFirstStep,
        isLastStep,
        isSubmitting,
        isOpticianMode,
        completedSteps,
        nextStep,
        previousStep,
        goToStep,
        canNavigateToStep,
        handleSubmit: () => handleFormSubmit(),
        processSectionsWithDebounce,
        visibleFieldIds,
        
        // Legal consent (now always true, handled on ConsentPage)
        consentGiven,
        onConsentChange: () => {}, // No-op since consent handled elsewhere
        showConsentStep,
        setShowConsentStep: () => {}, // No-op since consent handled elsewhere
      }}
    >
      <FormProvider {...form}>{children}</FormProvider>
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useFormContext must be used within a FormContextProvider");
  }
  return context;
};
