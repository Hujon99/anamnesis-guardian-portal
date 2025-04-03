
/**
 * This component wraps the patient form, handling the state management,
 * validation, and submission logic. It provides dynamic form generation
 * based on a template with conditional sections and questions.
 */

import React, { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTemplate } from "@/types/anamnesis";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Custom hooks
import { useFormValidation } from "@/hooks/useFormValidation";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useConditionalFields } from "@/hooks/useConditionalFields";
import { useFormSubmissionState } from "@/hooks/useFormSubmissionState";

// UI Components
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";

interface FormWrapperProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any, formattedAnswers?: any) => Promise<void>;
  isSubmitting: boolean;
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
  formTemplate,
  onSubmit,
  isSubmitting
}) => {
  // Initialize form with default values for all possible questions
  const generateDefaultValues = (template: FormTemplate) => {
    const defaultValues: Record<string, any> = {};
    
    template.sections.forEach(section => {
      section.questions.forEach(question => {
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
  
  // Initialize form with validation schema (if available)
  const form = useForm({
    defaultValues,
    mode: "onChange",
    resolver: validationSchema ? zodResolver(validationSchema) : undefined
  });
  
  const { watch, handleSubmit, trigger, formState } = form;
  const watchedValues = watch();
  
  // Use ref to compare current values with previous values to avoid unnecessary processing
  const previousValuesRef = useRef<string>(JSON.stringify(watchedValues));
  
  // Initialize our hooks for form state
  const { visibleSections, totalSections } = useConditionalFields(formTemplate, watchedValues);
  const { 
    currentStep, 
    nextStep, 
    previousStep, 
    isFirstStep, 
    isLastStep, 
    calculateProgress,
    setCurrentStep: setMultiStepFormCurrentStep
  } = useMultiStepForm({ totalSteps: totalSections });
  
  // Initialize the form submission state hook
  const { 
    processSectionsWithDebounce,
    setCurrentStep: setSubmissionStateCurrentStep,
    finalizeSubmissionData
  } = useFormSubmissionState(formTemplate);
  
  // Update the current step in our submission state hook when it changes
  useEffect(() => {
    setSubmissionStateCurrentStep(currentStep);
  }, [currentStep, setSubmissionStateCurrentStep]);
  
  // Process sections when values or visible sections change, with debouncing
  useEffect(() => {
    // Only process if we have visible sections for the current step
    if (visibleSections.length > 0 && currentStep < visibleSections.length) {
      // Check if values have changed significantly to avoid redundant processing
      const currentValuesJson = JSON.stringify(watchedValues);
      if (currentValuesJson !== previousValuesRef.current) {
        previousValuesRef.current = currentValuesJson;
        
        // Process all sections at the current step with debouncing
        processSectionsWithDebounce(visibleSections[currentStep], watchedValues);
      }
    }
  }, [currentStep, visibleSections, watchedValues, processSectionsWithDebounce]);
  
  // Handle next step logic with validation
  const handleNextStep = async () => {
    if (isLastStep) {
      // This is the last step, finalize the formatted answers and submit
      const formattedSubmissionData = finalizeSubmissionData();
      await handleSubmit((values) => onSubmit(values, formattedSubmissionData))();
      return;
    }
    
    // Validate only the fields in the current step
    const fieldsToValidate = getFieldsToValidate(visibleSections[currentStep]);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      nextStep();
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

  // Handle keyboard shortcuts for navigation
  useEffect(() => {
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
              handleNextStep();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, previousStep, handleNextStep]);
  
  return (
    <FormProvider {...form}>
      <Card>
        <FormHeader 
          title={formTemplate.title}
          currentStep={currentStep}
          totalSteps={totalSections}
          progress={calculateProgress()}
        />
        
        <CardContent>
          <form 
            id="patient-form" 
            onSubmit={(e) => e.preventDefault()} 
            className="space-y-6"
            aria-labelledby="form-title"
            noValidate
          >
            <div 
              id="step-info" 
              className="sr-only" 
            >
              Steg {currentStep + 1} av {totalSections}
            </div>
            
            {visibleSections.length > 0 && currentStep < visibleSections.length && (
              <FormStepContent 
                sections={visibleSections[currentStep]} 
                currentValues={watchedValues}
              />
            )}
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <FormNavigation 
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onNext={handleNextStep}
            onPrevious={previousStep}
          />
          
          <p className="text-sm text-muted-foreground text-center">
            All information behandlas konfidentiellt och används endast för din synundersökning.
          </p>
        </CardFooter>
      </Card>
    </FormProvider>
  );
};
