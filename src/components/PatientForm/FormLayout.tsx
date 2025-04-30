
/**
 * This component handles the structural layout of the form, including the header,
 * content area, and footer with navigation controls. It uses the form context
 * to access form state and functions.
 * Enhanced to handle conditional validation when submitting the form.
 */

import React, { useEffect } from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";
import { useFormContext } from "@/contexts/FormContext";
import { toast } from "sonner";
import { FieldError } from "react-hook-form";

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
    form,
    visibleFieldIds
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
      
      // Only validate visible fields on the current step
      if (visibleFieldIds && visibleFieldIds.length > 0) {
        // Get the visible fields for the current step
        const currentStepVisibleFields = visibleSections[currentStep]?.flatMap(section => 
          section.questions.map(q => q.id || q.runtimeId)
        ) || [];
        
        // Filter by what's actually visible
        const fieldsToValidate = currentStepVisibleFields.filter(
          fieldId => visibleFieldIds.includes(fieldId)
        );
        
        console.log("[FormLayout]: Re-validating visible fields:", fieldsToValidate);
        form.trigger(fieldsToValidate);
      }
    }
  }, [isLastStep, form, isSubmitting, visibleFieldIds, currentStep, visibleSections]);

  // New: Enhanced submit handler with better error handling and conditional validation
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
      
      // If we have visible field IDs, only validate those
      if (visibleFieldIds && visibleFieldIds.length > 0) {
        console.log("[FormLayout/handleFormSubmission]: Validating only visible fields:", visibleFieldIds.length);
        
        // Use custom submission handler that only validates visible fields
        toast.info("Skickar in dina svar...");
        
        // Use the context's submit handler which knows about field visibility
        const submitHandler = handleSubmit();
        submitHandler(formValues);
      } else {
        // Fallback to normal validation if we don't have visibility data
        console.log("[FormLayout/handleFormSubmission]: No visibility data, using standard validation");
        
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
          
          // Log which errors are for visible fields
          if (visibleFieldIds) {
            const visibleErrors = Object.entries(errors)
              .filter(([fieldId]) => visibleFieldIds.includes(fieldId))
              .map(([fieldId, error]) => ({ 
                fieldId, 
                message: (error as FieldError)?.message || "Validation error" 
              }));
              
            console.error("Visible field errors:", visibleErrors);
            
            if (visibleErrors.length === 0) {
              // If errors are only in hidden fields, we can still submit
              console.log("[FormLayout/handleFormSubmission]: Errors only in hidden fields, proceeding with submission");
              const submitHandler = handleSubmit();
              submitHandler(form.getValues());
              return;
            }
          }
          
          toast.error("Formuläret innehåller fel som måste åtgärdas");
        })();
        
        // Check if submission started after a short delay
        setTimeout(() => {
          if (!submissionStarted) {
            console.warn("[FormLayout/handleFormSubmission]: Submission may have failed to start");
            // Add error handling if needed
          }
        }, 1000);
      }
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
