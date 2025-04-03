
/**
 * This component wraps the patient form, handling the state management,
 * validation, and submission logic. It provides dynamic form generation
 * based on a template with conditional sections and questions.
 */

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTemplate } from "@/types/anamnesis";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Custom hooks
import { useFormValidation } from "@/hooks/useFormValidation";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { useConditionalFields } from "@/hooks/useConditionalFields";

// UI Components
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";

interface FormWrapperProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any) => Promise<void>;
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
  
  // Initialize form
  const form = useForm({
    defaultValues,
    mode: "onChange"
  });
  
  const { watch, handleSubmit, trigger, formState } = form;
  const currentValues = watch();
  
  // Custom hooks for form functionality
  const { validationSchema, getFieldsToValidate } = useFormValidation(formTemplate, currentValues);
  const { visibleSections, totalSections } = useConditionalFields(formTemplate, currentValues);
  const { 
    currentStep, 
    nextStep, 
    previousStep, 
    isFirstStep, 
    isLastStep, 
    calculateProgress 
  } = useMultiStepForm({ totalSteps: totalSections });
  
  // Update resolver when validation schema changes
  React.useEffect(() => {
    form.clearErrors();
    form.setError = validationSchema ? zodResolver(validationSchema)(form).setError : form.setError;
  }, [validationSchema, form]);
  
  // Handle next step logic with validation
  const handleNextStep = async () => {
    if (isLastStep) {
      // This is the last step, submit the form
      await handleSubmit(onSubmit)();
      return;
    }
    
    // Validate only the fields in the current step
    const fieldsToValidate = getFieldsToValidate(visibleSections[currentStep]);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      nextStep();
    }
  };
  
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
          <form id="patient-form" onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {visibleSections.length > 0 && currentStep < visibleSections.length && (
              <FormStepContent 
                sections={visibleSections[currentStep]} 
                currentValues={currentValues}
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
