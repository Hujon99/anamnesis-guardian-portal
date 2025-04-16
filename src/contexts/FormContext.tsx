/**
 * This context provides centralized state management for the patient form.
 * It handles form validation, navigation between steps, conditional fields,
 * and submission state, making these available throughout the form components.
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { FormTemplate, FormattedAnswerData, SubmissionData, FormSection } from "@/types/anamnesis";
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
  processSectionsWithDebounce: (sections: FormSection[], currentValues: Record<string, any>) => void;
  validationErrors: Record<string, string>;
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
  const safeFormTemplate = useMemo(() => {
    if (!formTemplate) {
      console.error("[FormContext]: Form template is null or undefined!");
      return {
        title: "Fel vid inläsning av formulär",
        sections: []
      };
    }
    
    if (!formTemplate.sections) {
      console.error("[FormContext]: Form template has no sections array!");
      return {
        ...formTemplate,
        sections: []
      };
    }
    
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
  
  const generateDefaultValues = (template: FormTemplate, initialVals: Record<string, any> | null) => {
    const defaultValues: Record<string, any> = {};
    
    if (!template || !template.sections) {
      console.error("[FormContext]: Cannot generate default values - invalid template structure");
      return defaultValues;
    }
    
    template.sections.forEach(section => {
      if (!section.questions) {
        console.error(`[FormContext]: Section "${section.section_title}" has no questions array`);
        return;
      }
      
      section.questions.forEach(question => {
        if (question.show_in_mode === "optician" && !isOpticianMode) {
          return;
        }
        
        if (initialVals && initialVals[question.id] !== undefined) {
          defaultValues[question.id] = initialVals[question.id];
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
    
    if (initialVals) {
      Object.keys(initialVals).forEach(key => {
        if (key.endsWith('_other') || key.endsWith('_övrigt')) {
          if (!(key in defaultValues)) {
            defaultValues[key] = initialVals[key];
          }
        }
      });
    }
    
    return defaultValues;
  };
  
  const defaultValues = generateDefaultValues(safeFormTemplate, initialValues);
  
  const { validationSchema, getFieldsToValidate } = useFormValidation(safeFormTemplate, defaultValues);
  
  const form = useForm({
    defaultValues,
    mode: "onChange",
    resolver: validationSchema ? zodResolver(validationSchema) : undefined
  });
  
  const { watch, handleSubmit, trigger, formState, reset } = form;
  const watchedValues = watch();
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  useEffect(() => {
    if (formState.errors) {
      const newErrors: Record<string, string> = {};
      Object.entries(formState.errors).forEach(([key, error]) => {
        if (error && error.message) {
          newErrors[key] = error.message as string;
        }
      });
      setValidationErrors(newErrors);
    } else {
      setValidationErrors({});
    }
  }, [formState.errors]);
  
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const currentValues = form.getValues();
      let needsReset = false;
      
      Object.keys(initialValues).forEach(key => {
        if (initialValues[key] !== currentValues[key]) {
          needsReset = true;
        }
      });
      
      if (needsReset) {
        reset(initialValues);
        toast({
          title: "Formulärdata återställd",
          description: "Dina tidigare ifyllda svar har återställts.",
        });
      }
    }
  }, [initialValues, reset, form]);
  
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

  React.useEffect(() => {
    setSubmissionStateCurrentStep(currentStep);
    
    if (visibleSections.length > 0 && currentStep < visibleSections.length) {
      processSectionsWithDebounce(visibleSections[currentStep], watchedValues);
    }
  }, [currentStep, setSubmissionStateCurrentStep, visibleSections, watchedValues, processSectionsWithDebounce]);

  const nextStep = async () => {
    if (isLastStep) {
      return;
    }
    
    const fieldsToValidate = getFieldsToValidate(visibleSections[currentStep]);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      goToNextStep();
      const stepInfo = document.getElementById('step-info');
      if (stepInfo) {
        stepInfo.setAttribute('aria-live', 'polite');
        setTimeout(() => {
          stepInfo.removeAttribute('aria-live');
        }, 1000);
      }
    } else {
      toast({
        title: "Du behöver fylla i alla obligatoriska fält",
        description: "Vänligen kontrollera fälten markerade med *",
        variant: "destructive"
      });
      
      const firstErrorEl = document.querySelector('[aria-invalid="true"]');
      if (firstErrorEl) {
        (firstErrorEl as HTMLElement).focus();
      }
      
      console.log("Validation errors:", formState.errors);
    }
  };

  const previousStep = () => {
    goToPreviousStep();
    window.scrollTo(0, 0);
  };

  const handleFormSubmit = useCallback((callback?: (values: any, formattedAnswers?: any) => Promise<any>) => {
    return async (values?: any, formattedAnswers?: any) => {
      if (!isLastStep) {
        return Promise.resolve();
      }
      
      const currentValues = values || form.getValues();
      
      const isValid = await trigger();
      if (!isValid) {
        toast({
          title: "Du behöver fylla i alla obligatoriska fält",
          description: "Vänligen kontrollera fälten markerade med *",
          variant: "destructive"
        });
        
        const firstErrorEl = document.querySelector('[aria-invalid="true"]');
        if (firstErrorEl) {
          (firstErrorEl as HTMLElement).focus();
        }
        
        return Promise.reject(new Error("Form validation failed"));
      }
      
      const formattedSubmissionData = finalizeSubmissionData() as SubmissionData;
      
      if (isOpticianMode && formattedSubmissionData) {
        if (formattedSubmissionData.formattedAnswers) {
          formattedSubmissionData.formattedAnswers.isOpticianSubmission = true;
        }
        
        currentValues._metadata = {
          submittedBy: 'optician',
          autoSetStatus: 'ready'
        };
      }
      
      try {
        if (callback) {
          return await callback(currentValues, formattedSubmissionData);
        } else if (onSubmit) {
          return await onSubmit(currentValues, formattedSubmissionData);
        } else {
          return Promise.resolve();
        }
      } catch (error) {
        throw error;
      }
    };
  }, [form, isLastStep, isOpticianMode, finalizeSubmissionData, onSubmit, trigger]);

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
    isOpticianMode,
    processSectionsWithDebounce,
    validationErrors
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
    isOpticianMode,
    processSectionsWithDebounce,
    validationErrors
  ]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

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
