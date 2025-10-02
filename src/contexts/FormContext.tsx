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
import { toast } from "sonner";
import { CURRENT_PRIVACY_POLICY_VERSION, CURRENT_TERMS_VERSION } from '@/legal';

interface FormContextProviderProps {
  children: React.ReactNode;
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: Record<string, any> | null;
  isOpticianMode?: boolean;
  onFormValuesChange?: (values: Record<string, any>) => void;
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
  onFormValuesChange
}) => {
  console.log("[FormContext]: Initializing FormContext with template:", {
    title: formTemplate?.title,
    sections: formTemplate?.sections?.length || 0
  });

  // Use state for form values that will be watched
  const [watchedFormValues, setWatchedFormValues] = useState<Record<string, any>>(initialValues || {});
  
  // Add state to track completed steps
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Legal consent is now handled on ConsentPage, so always true in form
  const [consentGiven] = useState(true);
  const [showConsentStep] = useState(false);
  
  // Setup conditional fields logic
  const { visibleSections, dynamicQuestions } = useConditionalFields(formTemplate, watchedFormValues, isOpticianMode);
  
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
  
  // Create the form with React Hook Form
  const form = useForm({
    defaultValues: initialValues || {},
    mode: "onTouched"
  });

  // Get the form values and handle them for auto-save
  const watchedValues = form.watch();
  
  // Update our local state when form values change
  useEffect(() => {
    setWatchedFormValues(watchedValues);
  }, [watchedValues]);
  
  // Call onFormValuesChange when form values change
  useEffect(() => {
    if (onFormValuesChange) {
      onFormValuesChange(watchedValues);
    }
  }, [watchedValues, onFormValuesChange]);

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
  // In a future update, we could implement actual debounced processing if needed
  const processSectionsWithDebounce = useCallback((sections: any[], values: Record<string, any>) => {
    // This is a stub implementation that doesn't do anything yet
    // console.log("[FormContext] Processing sections (stub implementation)");
    // In the future, this could implement debounced validation or other processing
  }, []);
  
  // Enhanced form submission handler with better error handling and debugging
  const handleFormSubmit = () => async (data: any) => {
    console.log("[FormContext/handleFormSubmit]: Form submission triggered", { 
      dataKeys: Object.keys(data).length,
      isOpticianMode,
      visibleFieldCount: visibleFieldIds.length
    });
    
    // CRITICAL: Use form.getValues() to get ALL values including metadata set via setValue
    const allFormValues = form.getValues();
    console.log("[FormContext/handleFormSubmit]: Retrieved all form values", {
      totalKeys: Object.keys(allFormValues).length,
      metadataKeys: Object.keys(allFormValues).filter(k => k.startsWith('_meta_')).length
    });
    
    try {
      // Validate only visible fields
      // console.log("[FormContext/handleFormSubmit]: Validating visible fields only");
      const isValid = await form.trigger(visibleFieldIds);
      
      if (!isValid) {
        console.error("[FormContext/handleFormSubmit]: Form validation failed for visible fields");
        const errors = form.formState.errors;
        console.error("Validation errors:", errors);
        
        // Check which errors are for visible fields
        const visibleErrors = Object.entries(errors)
          .filter(([fieldId]) => visibleFieldIds.includes(fieldId))
          .map(([fieldId, error]) => ({ fieldId, message: (error as any)?.message }));
          
        console.error("Visible field errors:", visibleErrors);
        
        if (visibleErrors.length > 0) {
          toast.error("Formuläret innehåller fel som måste åtgärdas");
          return;
        } else {
          // If errors are only in hidden fields, we can proceed
          // console.log("[FormContext/handleFormSubmit]: Errors only in hidden fields, proceeding with submission");
        }
      }
      
      console.log("[FormContext/handleFormSubmit]: Formatting answers for submission");
      // Use allFormValues instead of data to ensure metadata is included
      const formattedAnswers = formatAnswersForSubmission(allFormValues, formTemplate, isOpticianMode);
      console.log("[FormContext/handleFormSubmit]: Answers formatted successfully");
      
      // Add consent metadata to submission data (use allFormValues)
      const submissionData = {
        ...allFormValues,
        consent_given: consentGiven,
        privacy_policy_version: CURRENT_PRIVACY_POLICY_VERSION,
        terms_version: CURRENT_TERMS_VERSION
      };
      
      // Add circuit breaker
      const submissionTimeout = setTimeout(() => {
        console.warn("[FormContext/handleFormSubmit]: Submission is taking too long, may be stuck");
      }, 10000);
      
      try {
        // console.log("[FormContext/handleFormSubmit]: Calling onSubmit handler");
        await onSubmit(submissionData, formattedAnswers);
        console.log("[FormContext/handleFormSubmit]: Form submitted successfully");
        clearTimeout(submissionTimeout);
      } catch (error) {
        clearTimeout(submissionTimeout);
        console.error("[FormContext/handleFormSubmit]: Error submitting form:", error);
        toast.error("Det gick inte att skicka in formuläret");
        throw error;
      }
    } catch (error) {
      console.error("[FormContext/handleFormSubmit]: Error formatting answers:", error);
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
      // console.log("[FormContext/nextStep]: Validating fields for current step:", fields);
      // Only validate fields that are currently visible
      const visibleFields = fields.filter(fieldId => visibleFieldIds.includes(fieldId));
      // console.log("[FormContext/nextStep]: Visible fields for validation:", visibleFields);
      
      const isValid = await form.trigger(visibleFields);
      if (isValid) {
        // Mark current step as completed
        setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
        // console.log("[FormContext/nextStep]: Fields valid, proceeding to next step");
        goToNextStep();
      } else {
        // console.log("[FormContext/nextStep]: Field validation failed, staying on current step");
        toast.error("Vänligen åtgärda felen innan du fortsätter");
      }
    } catch (error) {
      console.error("[FormContext/nextStep]: Error during validation:", error);
    }
  };
  
  const previousStep = () => {
    // console.log("[FormContext/previousStep]: Moving to previous step");
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

  // Log state updates
  useEffect(() => {
    // console.log("[FormContext]: State updated", { 
    //   currentStep, 
    //   totalSections, 
    //   isLastStep, 
    //   isSubmitting,
    //   visibleFieldCount: visibleFieldIds.length
    // });
  }, [currentStep, totalSections, isLastStep, isSubmitting, visibleFieldIds]);

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
