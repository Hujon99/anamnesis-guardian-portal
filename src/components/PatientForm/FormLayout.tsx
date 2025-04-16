
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
    form,
    validationErrors
  } = useFormContext();

  // Show a descriptive message when submitting the form
  const handleFormSubmission = () => {
    console.log("[FormLayout]: Submit button clicked, triggering form submission");
    
    // Get current form values
    const formValues = form.getValues();
    
    // Log validation status
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      console.log("[FormLayout]: Form has validation errors:", validationErrors);
      toast.error("Du behöver fylla i alla obligatoriska fält", {
        description: "Vänligen kontrollera fälten markerade med *"
      });
      
      // Focus on first invalid field
      const firstErrorEl = document.querySelector('[aria-invalid="true"]');
      if (firstErrorEl) {
        (firstErrorEl as HTMLElement).focus();
      }
      return;
    }
    
    form.handleSubmit((data) => {
      console.log("[FormLayout]: Form data validated successfully for submission");
      toast.info("Skickar in dina svar...");
      // Call the submission handler from context with the current data
      handleSubmit()(data);
    })();
  };

  // The onSubmit handler now only prevents default behavior but doesn't trigger submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[FormLayout/onSubmit]: Form submit event intercepted and prevented");
  };

  // Ensure form re-validation when values change
  useEffect(() => {
    if (isLastStep && !isSubmitting) {
      console.log("[FormLayout]: On last step, re-validating fields");
      form.trigger();
    }
  }, [isLastStep, form, isSubmitting]);

  // Add accessibility announcement for errors
  useEffect(() => {
    const errorCount = Object.keys(validationErrors).length;
    if (errorCount > 0) {
      const errorAnnouncement = document.getElementById('error-announcement');
      if (errorAnnouncement) {
        errorAnnouncement.textContent = `${errorCount} obligatoriska fält saknar svar. Vänligen kontrollera formuläret.`;
      }
    }
  }, [validationErrors]);

  return (
    <>
      <FormHeader 
        currentStep={currentStep}
        totalSteps={totalSections}
        progress={progress}
        createdByName={createdByName}
      />
      
      {/* Hidden element for screen readers to announce errors */}
      <div 
        id="error-announcement" 
        className="sr-only" 
        aria-live="assertive"
        role="alert"
      ></div>
      
      <CardContent>
        <form 
          id="patient-form" 
          onSubmit={onSubmit}
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
