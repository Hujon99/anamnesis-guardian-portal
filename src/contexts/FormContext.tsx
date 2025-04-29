/**
 * This context provides form state and functions for all form components.
 * It manages the multi-step form flow, validation, and submission process.
 * Enhanced to support form values change events for auto-save functionality.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTemplate } from "@/types/anamnesis";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useConditionalFields } from "@/hooks/useConditionalFields";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";

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
  nextStep: () => void;
  previousStep: () => void;
  handleSubmit: () => (data: any) => Promise<void>;
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
  // Setup form validation based on the form template
  const { schema: validationSchema, defaultValues: initialFormValues } = useFormValidation(formTemplate, initialValues);

  // Create the form with React Hook Form
  const { schema, defaultValues } = useFormValidation(formTemplate, initialValues);
  const form = useForm({
    resolver: zodResolver(schema as z.ZodType<any>),
    defaultValues,
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
  const {
    currentStep,
    totalSections,
    progress,
    goToNextStep,
    goToPreviousStep,
    isFirstStep,
    isLastStep,
  } = useMultiStepForm(visibleSections.length);

  // Format answers for submission
  const { formatAnswersForSubmission } = useFormattedRawData();
  
  const handleFormSubmit = () => async (data: any) => {
    try {
      const formattedAnswers = formatAnswersForSubmission(data, formTemplate);
      await onSubmit(data, formattedAnswers);
    } catch (error) {
      console.error("[FormContext] Error submitting form:", error);
      throw error;
    }
  };

  // Next and Previous step handlers
  const nextStep = async () => {
    const fields = getFieldsForCurrentStep();
    
    const isValid = await form.trigger(fields);
    if (isValid) {
      goToNextStep();
    }
  };
  
  const previousStep = () => {
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
        nextStep,
        previousStep,
        handleSubmit: () => handleFormSubmit()
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
