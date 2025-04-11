/**
 * This context provides centralized state management for the patient form.
 * It handles form validation, navigation between steps, conditional fields,
 * and submission state, making these available throughout the form components.
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { FormTemplate, FormattedAnswerData, SubmissionData } from "@/types/anamnesis";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/use-toast";

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
  initialValues?: Record<string, any> | null;
}

export const FormContextProvider: React.FC<FormContextProviderProps> = ({
  children,
  formTemplate,
  onSubmit,
  isSubmitting,
  isOpticianMode = false,
  initialValues = null
}) => {
  // Add defensive check for form template structure
  const safeFormTemplate = useMemo(() => {
    // Log the raw form template for debugging
    console.log("[FormContext]: Received formTemplate:", formTemplate);
    
    // Check if we have a valid form template
    if (!formTemplate) {
      console.error("[FormContext]: Form template is null or undefined!");
      // Return a minimal valid template to prevent errors
      return {
        title: "Fel vid inläsning av formulär",
        sections: []
      };
    }
    
    // Check if sections exist
    if (!formTemplate.sections) {
      console.error("[FormContext]: Form template has no sections array!");
      // Provide a placeholder sections array
      return {
        ...formTemplate,
        sections: []
      };
    }
    
    // Check if each section has a questions array
    const validatedSections = formTemplate.sections.map(section => {
      if (!section.questions) {
        console.error(`[FormContext]: Section "${section.section_title}" has no questions array!`);
        return {
          ...section,
          questions: []
        };
      }
      return section;
    });
    
    return {
      ...formTemplate,
      sections: validatedSections
    };
  }, [formTemplate]);
  
  // Initialize form with default values
  const generateDefaultValues = (template: FormTemplate, initialVals: Record<string, any> | null) => {
    const defaultValues: Record<string, any> = {};
    
    // Check if template and sections exist before trying to iterate
    if (!template || !template.sections) {
      console.error("[FormContext]: Cannot generate default values - invalid template structure");
      return defaultValues;
    }
    
    template.sections.forEach(section => {
      // Check if questions exist before trying to iterate
      if (!section.questions) {
        console.error(`[FormContext]: Section "${section.section_title}" has no questions array`);
        return;
      }
      
      section.questions.forEach(question => {
        // Skip questions that are only for opticians if we're not in optician mode
        if (question.show_in_mode === "optician" && !isOpticianMode) {
          return;
        }
        
        // First check if we have an initial value for this field
        if (initialVals && initialVals[question.id] !== undefined) {
          defaultValues[question.id] = initialVals[question.id];
          console.log(`[FormContext]: Using initial value for ${question.id}:`, initialVals[question.id]);
          return;
        }
        
        // Otherwise use the default value based on field type
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
    
    // If we have an "other" field in the initial values, add it too
    if (initialVals) {
      Object.keys(initialVals).forEach(key => {
        if (key.endsWith('_other') || key.endsWith('_övrigt')) {
          if (!(key in defaultValues)) {
            defaultValues[key] = initialVals[key];
            console.log(`[FormContext]: Added other field ${key} with value:`, initialVals[key]);
          }
        }
      });
    }
    
    return defaultValues;
  };
  
  // Use the safeFormTemplate instead of the raw formTemplate
  const defaultValues = generateDefaultValues(safeFormTemplate, initialValues);
  
  console.log("[FormContext]: Generated default values with initialValues:", 
    initialValues ? "present" : "not present", defaultValues);
  
  // Custom hooks for form functionality
  const { validationSchema, getFieldsToValidate } = useFormValidation(safeFormTemplate, defaultValues);
  
  // Initialize form with validation schema
  const form = useForm({
    defaultValues,
    mode: "onChange",
    resolver: validationSchema ? zodResolver(validationSchema) : undefined
  });
  
  const { watch, handleSubmit, trigger, formState, reset } = form;
  const watchedValues = watch();
  
  // Reset form with initial values if provided later (e.g., after an error)
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      // Only reset if we have different values than what's already in the form
      const currentValues = form.getValues();
      let needsReset = false;
      
      // Check if any values differ
      Object.keys(initialValues).forEach(key => {
        if (initialValues[key] !== currentValues[key]) {
          needsReset = true;
        }
      });
      
      if (needsReset) {
        console.log("[FormContext]: Resetting form with stored values", initialValues);
        reset(initialValues);
        
        // Show toast notification
        toast({
          title: "Formulärdata återställd",
          description: "Dina tidigare ifyllda svar har återställts.",
        });
      }
    }
  }, [initialValues, reset, form]);
  
  // Initialize hooks for form state - use safeFormTemplate instead of raw formTemplate
  const { visibleSections, totalSections } = useConditionalFields(safeFormTemplate, watchedValues, isOpticianMode);
  
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
  } = useFormSubmissionState(safeFormTemplate);

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

  // Enhanced submit handler with better error handling
  const handleFormSubmit = useCallback((callback?: (values: any, formattedAnswers?: any) => Promise<any>) => {
    return async (values?: any, formattedAnswers?: any) => {
      console.log("[FormContext/handleFormSubmit]: Submission handler called");
      console.log("[FormContext/handleFormSubmit]: isLastStep:", isLastStep);
      
      if (!isLastStep) {
        console.log("[FormContext/handleFormSubmit]: Not on last step, submission prevented");
        return Promise.resolve();
      }
      
      console.log("[FormContext/handleFormSubmit]: On last step, proceeding with submission");
      
      // Get the current form values if not provided
      const currentValues = values || form.getValues();
      
      // Finalize the formatted answers and submit
      const formattedSubmissionData = finalizeSubmissionData() as SubmissionData;
      
      console.log("[FormContext/handleFormSubmit]: Form submission triggered with values:", currentValues);
      console.log("[FormContext/handleFormSubmit]: Formatted submission data:", formattedSubmissionData);
      
      // Add optician flag directly to the formatted data if applicable
      if (isOpticianMode && formattedSubmissionData) {
        // Set the flag in the appropriate location
        if (formattedSubmissionData.formattedAnswers) {
          formattedSubmissionData.formattedAnswers.isOpticianSubmission = true;
        }
        
        // Also add metadata for the edge function
        currentValues._metadata = {
          submittedBy: 'optician',
          autoSetStatus: 'ready'
        };
        
        console.log("[FormContext/handleFormSubmit]: Added optician mode metadata to submission");
      }
      
      try {
        // If a callback was provided, call it with the form values and formatted answers
        if (callback) {
          console.log("[FormContext/handleFormSubmit]: Using provided callback for submission");
          return await callback(currentValues, formattedSubmissionData);
        } else if (onSubmit) {
          // Fall back to the onSubmit prop if no specific callback was provided
          console.log("[FormContext/handleFormSubmit]: Using default onSubmit handler from props");
          return await onSubmit(currentValues, formattedSubmissionData);
        } else {
          console.warn("[FormContext/handleFormSubmit]: No submission handler provided");
          return Promise.resolve();
        }
      } catch (error) {
        console.error("[FormContext/handleFormSubmit]: Error during form submission:", error);
        // Propagate the error so it can be handled by the caller
        throw error;
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
