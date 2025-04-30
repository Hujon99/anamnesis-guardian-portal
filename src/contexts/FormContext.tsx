
/**
 * This context provides form state and functions for all form components.
 * It manages the multi-step form flow, validation, and submission process.
 * Enhanced to support form values change events for auto-save functionality.
 * Enhanced with better error handling and detailed logging for debugging.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTemplate } from "@/types/anamnesis";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useConditionalFields } from "@/hooks/useConditionalFields";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";
import { toast } from "sonner";

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
  nextStep: () => void;
  previousStep: () => void;
  handleSubmit: () => (data: any) => Promise<void>;
  processSectionsWithDebounce?: (sections: any[], values: Record<string, any>) => void;
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

  // Setup form validation based on the form template
  const validation = useFormValidation(formTemplate, initialValues);
  
  // Create the form with React Hook Form - handle the case where defaultValues might not exist
  const form = useForm({
    resolver: zodResolver(validation.validationSchema as z.ZodType<any>),
    defaultValues: validation.defaultValues || {}, // Safely handle defaultValues if it doesn't exist
    mode: "onTouched"
  });

  // Get the form values and handle them for auto-save
  const watchedValues = form.watch();
  
  // Call onFormValuesChange when form values change
  useEffect(() => {
    if (onFormValuesChange) {
      onFormValuesChange(watchedValues);
    }
  }, [watchedValues, onFormValuesChange]);

  // Setup conditional fields logic
  const { visibleSections } = useConditionalFields(formTemplate, watchedValues, isOpticianMode);

  // Setup multi-step form navigation
  const multiStepForm = useMultiStepForm({ 
    totalSteps: visibleSections.length, 
    initialStep: 0 
  });
  
  const {
    currentStep,
    nextStep: goToNextStep,
    previousStep: goToPreviousStep,
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
    console.log("[FormContext] Processing sections (stub implementation)");
    // In the future, this could implement debounced validation or other processing
  }, []);
  
  // Enhanced form submission handler with better error handling and debugging
  const handleFormSubmit = () => async (data: any) => {
    console.log("[FormContext/handleFormSubmit]: Form submission triggered", { 
      dataKeys: Object.keys(data).length,
      isOpticianMode
    });
    
    try {
      console.log("[FormContext/handleFormSubmit]: Formatting answers for submission");
      const formattedAnswers = formatAnswersForSubmission(data, formTemplate, isOpticianMode);
      console.log("[FormContext/handleFormSubmit]: Answers formatted successfully");
      
      // Add circuit breaker
      const submissionTimeout = setTimeout(() => {
        console.warn("[FormContext/handleFormSubmit]: Submission is taking too long, may be stuck");
      }, 10000);
      
      try {
        console.log("[FormContext/handleFormSubmit]: Calling onSubmit handler");
        await onSubmit(data, formattedAnswers);
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

  // Next and Previous step handlers
  const nextStep = async () => {
    const fields = getFieldsForCurrentStep();
    
    try {
      console.log("[FormContext/nextStep]: Validating fields for current step:", fields);
      const isValid = await form.trigger(fields);
      if (isValid) {
        console.log("[FormContext/nextStep]: Fields valid, proceeding to next step");
        goToNextStep();
      } else {
        console.log("[FormContext/nextStep]: Field validation failed, staying on current step");
        // Could add a toast here to inform the user
      }
    } catch (error) {
      console.error("[FormContext/nextStep]: Error during validation:", error);
    }
  };
  
  const previousStep = () => {
    console.log("[FormContext/previousStep]: Moving to previous step");
    goToPreviousStep();
  };
  
  // Helper to get fields for the current step
  const getFieldsForCurrentStep = (): string[] => {
    if (!visibleSections[currentStep]) return [];
    
    return visibleSections[currentStep].flatMap((section: any) => {
      if (!section.questions) return [];
      return section.questions.map((q: any) => q.id || q.runtimeId);
    });
  };

  // Log state updates
  useEffect(() => {
    console.log("[FormContext]: State updated", { 
      currentStep, 
      totalSections, 
      isLastStep, 
      isSubmitting 
    });
  }, [currentStep, totalSections, isLastStep, isSubmitting]);

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
        nextStep,
        previousStep,
        handleSubmit: () => handleFormSubmit(),
        processSectionsWithDebounce
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
