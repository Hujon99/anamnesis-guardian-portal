
/**
 * This context provides centralized state management for the patient form.
 * It handles form validation, navigation between steps, conditional fields,
 * and submission state, making these available throughout the form components.
 */

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { FormTemplate } from "@/types/anamnesis";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Custom hooks
import { useFormValidation } from "@/hooks/useFormValidation";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useConditionalFields } from "@/hooks/useConditionalFields";
import { useFormSubmissionState } from "@/hooks/useFormSubmissionState";

// Types
type FormContextValue = {
  form: ReturnType<typeof useForm>;
  currentStep: number;
  watchedValues: Record<string, any>;
  visibleSections: Array<Array<any>>;
  totalSections: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number;
  nextStep: () => void;
  previousStep: () => void;
  isSubmitting: boolean;
  handleSubmit: (callback: (values: any, formattedAnswers?: any) => Promise<void>) => (values?: any, formattedAnswers?: any) => void;
  isOpticianMode: boolean;
};

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormContextProvider");
  }
  return context;
};

interface FormContextProviderProps {
  children: React.ReactNode;
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
  isOpticianMode?: boolean;
}

export const FormContextProvider: React.FC<FormContextProviderProps> = ({
  children,
  formTemplate,
  onSubmit,
  isSubmitting,
  isOpticianMode = false
}) => {
  // Initialize form with default values
  const generateDefaultValues = (template: FormTemplate) => {
    const defaultValues: Record<string, any> = {};
    
    template.sections.forEach(section => {
      section.questions.forEach(question => {
        // Skip questions that are only for opticians if we're not in optician mode
        if (question.show_in_mode === "optician" && !isOpticianMode) {
          return;
        }
        
        switch (question.type) {
          case "checkbox":
            defaultValues[question.id] = false;
            break;
          case "number":
            defaultValues[question.id] = "";
            break;
          default:
            defaultValues[question.id] = "";
        }
      });
    });
    
    return defaultValues;
  };
  
  const defaultValues = generateDefaultValues(formTemplate);
  
  // Custom hooks for form functionality
  const { validationSchema, getFieldsToValidate } = useFormValidation(formTemplate, defaultValues);
  
  // Initialize form with validation schema
  const form = useForm({
    defaultValues,
    mode: "onChange",
    resolver: validationSchema ? zodResolver(validationSchema) : undefined
  });
  
  const { watch, handleSubmit, trigger } = form;
  const watchedValues = watch();
  
  // Initialize hooks for form state
  // Pass isOpticianMode to ensure fields are properly filtered
  const { visibleSections, totalSections } = useConditionalFields(formTemplate, watchedValues, isOpticianMode);
  
  const { 
    currentStep, 
    nextStep: goToNextStep, 
    previousStep: goToPreviousStep, 
    isFirstStep, 
    isLastStep, 
    calculateProgress,
    setCurrentStep
  } = useMultiStepForm({ totalSteps: totalSections });
  
  const { 
    processSectionsWithDebounce,
    setCurrentStep: setSubmissionStateCurrentStep,
    finalizeSubmissionData
  } = useFormSubmissionState(formTemplate);

  // Process sections when values change (with debounce)
  React.useEffect(() => {
    setSubmissionStateCurrentStep(currentStep);
    
    // Only process if we have visible sections for the current step
    if (visibleSections.length > 0 && currentStep < visibleSections.length) {
      // Process all sections at the current step with debouncing
      processSectionsWithDebounce(visibleSections[currentStep], watchedValues);
    }
  }, [currentStep, setSubmissionStateCurrentStep, visibleSections, watchedValues, processSectionsWithDebounce]);

  // Handle next step with validation
  const nextStep = async () => {
    if (isLastStep) {
      return;
    }
    
    // Validate only the fields in the current step
    const fieldsToValidate = getFieldsToValidate(visibleSections[currentStep]);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      goToNextStep();
      // Announce step change to screen readers
      const stepInfo = document.getElementById('step-info');
      if (stepInfo) {
        stepInfo.setAttribute('aria-live', 'polite');
        setTimeout(() => {
          stepInfo.removeAttribute('aria-live');
        }, 1000);
      }
    } else {
      // Announce validation errors to screen readers
      const firstErrorEl = document.querySelector('[aria-invalid="true"]');
      if (firstErrorEl) {
        (firstErrorEl as HTMLElement).focus();
      }
    }
  };

  // Handle previous step
  const previousStep = () => {
    goToPreviousStep();
    window.scrollTo(0, 0); // Scroll to top for the new step
  };

  // Handle form submission
  const handleFormSubmit = useCallback((callback: (values: any, formattedAnswers?: any) => Promise<void>) => {
    return (values?: any, formattedAnswers?: any) => {
      if (isLastStep) {
        // Get the current form values if not provided
        const currentValues = values || form.getValues();
        
        // Finalize the formatted answers and submit
        const formattedSubmissionData = formattedAnswers || finalizeSubmissionData();
        
        // Make sure we have a properly typed object to add the optician flag to
        const formattedSubmissionDataWithOptician = formattedSubmissionData || {};
        
        // Add a flag to indicate this was submitted in optician mode if applicable
        if (isOpticianMode) {
          // Ensure we don't get TypeScript errors by checking the structure
          if (typeof formattedSubmissionDataWithOptician === 'object') {
            // @ts-ignore - We're adding a dynamic property that might not be in the type definition
            formattedSubmissionDataWithOptician.isOpticianSubmission = true;
          }
        }
        
        console.log("Form submission triggered with values:", currentValues);
        return callback(currentValues, formattedSubmissionDataWithOptician);
      }
    };
  }, [form, isLastStep, isOpticianMode, finalizeSubmissionData]);

  // Create memoized context value
  const contextValue = useMemo(() => ({
    form,
    currentStep,
    watchedValues,
    visibleSections,
    totalSections,
    isFirstStep,
    isLastStep,
    progress: calculateProgress(),
    nextStep,
    previousStep,
    isSubmitting,
    handleSubmit: handleFormSubmit,
    isOpticianMode
  }), [
    form,
    currentStep,
    watchedValues,
    visibleSections,
    totalSections,
    isFirstStep,
    isLastStep,
    calculateProgress,
    isSubmitting,
    handleFormSubmit,
    isOpticianMode
  ]);

  // Keyboard shortcuts for navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process shortcuts if no modal is open and not in a text field
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      // Alt+Left: Previous step, Alt+Right: Next step
      if (e.altKey) {
        switch (e.key) {
          case 'ArrowLeft':
            if (!isFirstStep) {
              e.preventDefault();
              previousStep();
            }
            break;
          case 'ArrowRight':
            if (!isLastStep) {
              e.preventDefault();
              nextStep();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, nextStep, previousStep]);

  return (
    <FormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </FormContext.Provider>
  );
};
