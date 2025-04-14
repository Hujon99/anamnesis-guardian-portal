
/**
 * This component handles the structural layout of the form, including the header,
 * content area, and footer with navigation controls. It uses the form context
 * to access form state and functions.
 */

import React, { useEffect } from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";
import { useFormContext } from "@/contexts/FormContext";
import { toast } from "sonner";

interface FormLayoutProps {
  createdByName?: string | null;
}

export const FormLayout: React.FC<FormLayoutProps> = ({ createdByName }) => {
  const { 
    currentStep, 
    totalSections, 
    progress, 
    visibleSections,
    watchedValues,
    isFirstStep,
    isLastStep,
    nextStep,
    previousStep,
    isSubmitting,
    handleSubmit,
    form
  } = useFormContext();

  // Log when dynamic values change to help debug follow-up questions
  useEffect(() => {
    // Log any values that might be follow-up questions (with _for_ in the key)
    const dynamicValues = Object.entries(watchedValues || {})
      .filter(([key]) => key.includes('_for_'))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);
      
    if (Object.keys(dynamicValues).length > 0) {
      console.log("[FormLayout] Dynamic follow-up values:", dynamicValues);
    }
  }, [watchedValues]);

  // The onSubmit handler now only prevents default behavior but doesn't trigger submission
  // This prevents automatic form submission when pressing Enter or when the form is naturally submitted
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[FormLayout/onSubmit]: Form submit event intercepted and prevented");
    // We no longer automatically submit the form here
    // The actual submission will only happen when the user clicks the Submit button
  };

  // Ensure form re-validation when values change
  useEffect(() => {
    if (isLastStep && !isSubmitting) {
      // Trigger validation for all current step fields
      console.log("[FormLayout]: On last step, re-validating fields");
      form.trigger();
    }
  }, [isLastStep, form, isSubmitting]);

  return (
    <>
      <FormHeader 
        currentStep={currentStep}
        totalSteps={totalSections}
        progress={progress}
        createdByName={createdByName}
      />
      
      <CardContent>
        <form 
          id="patient-form" 
          onSubmit={onSubmit} // Only prevents default, doesn't trigger submission
          className="space-y-6"
          aria-labelledby="form-title"
          noValidate
        >
          <div 
            id="step-info" 
            className="sr-only" 
            aria-live="polite"
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
          onNext={nextStep}
          onPrevious={previousStep}
          onSubmit={() => {
            console.log("[FormLayout]: Submit button clicked, triggering form submission");
            // Get all current form values
            const formValues = form.getValues();
            console.log("[FormLayout/onSubmit]: Current form values for submission:", formValues);
            
            // Count dynamic follow-up values
            const dynamicValues = Object.keys(formValues).filter(key => key.includes('_for_'));
            if (dynamicValues.length > 0) {
              console.log("[FormLayout/onSubmit]: Found", dynamicValues.length, "dynamic follow-up values");
            } else {
              console.warn("[FormLayout/onSubmit]: No dynamic follow-up values found! Check if they're being captured correctly");
            }
            
            form.handleSubmit((data) => {
              console.log("[FormLayout/onSubmit]: Form data validated successfully for submission");
              toast.info("Skickar in dina svar...");
              // Call the submission handler from context with the current data
              handleSubmit()(data);
            })();
          }}
        />
        
        <p className="text-sm text-muted-foreground text-center">
          All information behandlas konfidentiellt och används endast för din synundersökning.
        </p>
      </CardFooter>
    </>
  );
};
