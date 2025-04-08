
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
      // This will call the actual submission function passed in the context
      form.handleSubmit((data) => {
        console.log("FormLayout: Final form submission triggered with data:", data);
        // Call the submission handler from context with the current data
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
            console.log("FormNavigation: Form submission triggered from 'Next' button");
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
