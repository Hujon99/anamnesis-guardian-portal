
/**
 * This context provides centralized state management for the patient form.
 * It handles form validation, navigation between steps, conditional fields,
 * and submission state, making these available throughout the form components.
 */

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { FormTemplate, FormattedAnswerData, SubmissionData } from "@/types/anamnesis";
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
  handleSubmit: (callback?: (values: any, formattedAnswers?: any) => Promise<any>) => (values?: any, formattedAnswers?: any) => void;
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
  onSubmit: (values: any, formattedAnswers?: any) => Promise<any>;
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
  console.log("[FormContextProvider]: Initializing with isOpticianMode:", isOpticianMode);
  
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
      console.log("[FormContext/useEffect]: Processing sections for step", currentStep, "isOpticianMode:", isOpticianMode);
      processSectionsWithDebounce(visibleSections[currentStep], watchedValues);
    }
  }, [currentStep, setSubmissionStateCurrentStep, visibleSections, watchedValues, processSectionsWithDebounce]);

  // Handle next step with validation
  const nextStep = async () => {
    if (isLastStep) {
      console.log("[FormContext/nextStep]: On last step, not proceeding to next");
      return;
    }
    
    // Validate only the fields in the current step
    const fieldsToValidate = getFieldsToValidate(visibleSections[currentStep]);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      console.log("[FormContext/nextStep]: Step validation successful, moving to next step");
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
      console.log("[FormContext/nextStep]: Step validation failed");
      // Announce validation errors to screen readers
      const firstErrorEl = document.querySelector('[aria-invalid="true"]');
      if (firstErrorEl) {
        (firstErrorEl as HTMLElement).focus();
      }
    }
  };

  // Handle previous step
  const previousStep = () => {
    console.log("[FormContext/previousStep]: Moving to previous step");
    goToPreviousStep();
    window.scrollTo(0, 0); // Scroll to top for the new step
  };

  // Handle form submission
  const handleFormSubmit = useCallback((callback?: (values: any, formattedAnswers?: any) => Promise<any>) => {
    return (values?: any, formattedAnswers?: any) => {
      console.log("[FormContext/handleFormSubmit]: Submission handler called");
      console.log("[FormContext/handleFormSubmit]: isLastStep:", isLastStep);
      console.log("[FormContext/handleFormSubmit]: isOpticianMode:", isOpticianMode);
      
      if (!isLastStep) {
        console.log("[FormContext/handleFormSubmit]: Not on last step, submission prevented");
        return Promise.resolve();
      }
      
      console.log("[FormContext/handleFormSubmit]: On last step, proceeding with submission");
      
      // Get the current form values if not provided
      const currentValues = values || form.getValues();
      
      // Finalize the formatted answers
      console.log("[FormContext/handleFormSubmit]: Finalizing submission data with isOpticianMode:", isOpticianMode);
      const formattedSubmissionData = finalizeSubmissionData();
      
      // Add optician flags to the formatted answers
      if (isOpticianMode && formattedSubmissionData) {
        console.log("[FormContext/handleFormSubmit]: Adding optician mode flags to submission data");
        
        if (formattedSubmissionData.formattedAnswers) {
          formattedSubmissionData.formattedAnswers.isOpticianSubmission = true;
          console.log("[FormContext/handleFormSubmit]: Added isOpticianSubmission flag to formattedAnswers");
        }
        
        // Also add the metadata to the values object for the edge function
        currentValues._metadata = {
          submittedBy: 'optician',
          autoSetStatus: 'ready'
        };
      }
      
      console.log("[FormContext/handleFormSubmit]: Form submission triggered with values:", currentValues);
      console.log("[FormContext/handleFormSubmit]: Formatted submission data:", formattedSubmissionData);
      
      // If a callback was provided, call it with the form values and formatted answers
      if (callback) {
        console.log("[FormContext/handleFormSubmit]: Using provided callback for submission");
        return callback(currentValues, formattedSubmissionData);
      } else if (onSubmit) {
        // Fall back to the onSubmit prop if no specific callback was provided
        console.log("[FormContext/handleFormSubmit]: Using default onSubmit handler from props");
        return onSubmit(currentValues, formattedSubmissionData);
      } else {
        console.warn("[FormContext/handleFormSubmit]: No submission handler provided");
        return Promise.resolve();
      }
    };
  }, [form, isLastStep, isOpticianMode, finalizeSubmissionData, onSubmit]);

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
