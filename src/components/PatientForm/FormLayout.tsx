
/**
 * This component handles the structural layout of the form, including the header,
 * content area, and footer with navigation controls. It uses the form context
 * to access form state and functions.
 */

import React from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";
import { useFormContext } from "@/contexts/FormContext";

export const FormLayout: React.FC = () => {
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

  // The actual submission handler that should be called when the form is submitted
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      // Execute the final submit action by passing the current form data
      console.log("[FormLayout/onSubmit]: Form submission triggered from form submit event");
      form.handleSubmit((data) => {
        console.log("[FormLayout/onSubmit]: Form data validated successfully, calling context handleSubmit");
        // Call the submission handler from context with the current data
        // Important: We're NOT providing a callback here because the context already has the onSubmit handler
        handleSubmit()(data);
      })();
    }
  };

  return (
    <>
      <FormHeader 
        currentStep={currentStep}
        totalSteps={totalSections}
        progress={progress}
      />
      
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
          onNext={isLastStep ? form.handleSubmit((data) => {
            console.log("[FormLayout/FormNavigation]: Form submission triggered from 'Next' button");
            // Call the submission handler from context without providing a callback
            // The context already has the onSubmit handler from the parent component
            handleSubmit()(data);
          }) : nextStep}
          onPrevious={previousStep}
        />
        
        <p className="text-sm text-muted-foreground text-center">
          All information behandlas konfidentiellt och används endast för din synundersökning.
        </p>
      </CardFooter>
    </>
  );
};
