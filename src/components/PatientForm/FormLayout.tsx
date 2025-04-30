
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

  // New: Enhanced submit handler with better error handling
  const handleFormSubmission = () => {
    console.log("[FormLayout/handleFormSubmission]: Starting form submission process");
    
    try {
      // Get all current form values
      const formValues = form.getValues();
      console.log("[FormLayout/handleFormSubmission]: Current form values for submission:", formValues);
      
      // Count dynamic follow-up values
      const dynamicValues = Object.keys(formValues).filter(key => key.includes('_for_'));
      console.log("[FormLayout/handleFormSubmission]: Found", dynamicValues.length, "dynamic follow-up values");
      
      // Enhanced debugging to check form state
      console.log("[FormLayout/handleFormSubmission]: Form state:", {
        isValid: form.formState.isValid,
        isDirty: form.formState.isDirty,
        errors: form.formState.errors,
        isSubmitting: form.formState.isSubmitting
      });
      
      // Simple circuit breaker to prevent getting stuck
      let submissionStarted = false;
      
      // Use handleSubmit from react-hook-form to validate and submit
      form.handleSubmit((data) => {
        console.log("[FormLayout/handleFormSubmission]: Form validated successfully, proceeding with submission");
        submissionStarted = true;
        toast.info("Skickar in dina svar...");
        
        // Call the submission handler from context with the current data
        try {
          const submitHandler = handleSubmit();
          console.log("[FormLayout/handleFormSubmission]: Calling submit handler with data");
          submitHandler(data);
        } catch (error) {
          console.error("[FormLayout/handleFormSubmission]: Error in submit handler:", error);
          toast.error("Ett fel uppstod vid inskickning av formuläret");
        }
      }, (errors) => {
        // This will run if validation fails
        console.error("[FormLayout/handleFormSubmission]: Form validation failed:", errors);
        toast.error("Formuläret innehåller fel som måste åtgärdas");
      })();
      
      // Check if submission started after a short delay
      setTimeout(() => {
        if (!submissionStarted) {
          console.warn("[FormLayout/handleFormSubmission]: Submission may have failed to start");
          // Add error handling if needed
        }
      }, 1000);
    } catch (error) {
      console.error("[FormLayout/handleFormSubmission]: Unexpected error during form submission:", error);
      toast.error("Ett oväntat fel uppstod");
    }
  };

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
          onSubmit={handleFormSubmission}
        />
        
        <p className="text-sm text-muted-foreground text-center">
          All information behandlas konfidentiellt och används endast för din synundersökning.
        </p>
      </CardFooter>
    </>
  );
};
