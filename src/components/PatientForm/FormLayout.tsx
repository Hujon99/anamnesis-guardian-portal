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

// 1. Add isSubmitting to the props interface (if using one) or just expect it
interface FormLayoutProps {
  isSubmitting: boolean; // Add this prop
  onSubmitTrigger: () => void; // Add a prop to trigger the actual submission
}

// Make FormLayout accept props
export const FormLayout: React.FC<FormLayoutProps> = ({ isSubmitting, onSubmitTrigger }) => {
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
    form,
    isOpticianMode,
    finalizeSubmissionData  // Add this to access the function that prepares the formatted answers
  } = useFormContext();

  // console.log("[FormLayout]: Rendering with isOpticianMode:", isOpticianMode);

  // The onSubmit handler now only prevents default behavior but doesn't trigger submission
  // This prevents automatic form submission when pressing Enter or when the form is naturally submitted
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[FormLayout/onSubmit]: Form submit event intercepted and prevented");
    // We no longer automatically submit the form here
    // The actual submission will only happen when the user clicks the Submit button
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
          onSubmit={onSubmit} // Only prevents default, doesn't trigger submission
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
          isSubmitting={isSubmitting} // 2. Pass the prop here
          onNext={nextStep}
          onPrevious={previousStep}
          onSubmit={onSubmitTrigger} // Use the passed trigger function
        />
        
        <p className="text-sm text-muted-foreground text-center">
          All information behandlas konfidentiellt och används endast för din synundersökning.
        </p>
      </CardFooter>
    </>
  );
};
