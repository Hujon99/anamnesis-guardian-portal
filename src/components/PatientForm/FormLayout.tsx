
/**
 * This component handles the structural layout of the form, including the header,
 * content area, and footer with navigation controls. It uses the form context
 * to access form state and functions.
 * Enhanced to handle conditional validation when submitting the form and
 * support direct navigation between form sections.
 * Fixed premature validation issues on the last step.
 * Now supports both traditional multi-section layout and single-question layout for mobile/iPad.
 */

import React, { useEffect, useState } from "react";
import { CardContent, CardFooter } from "@/components/ui/card";
import FormHeader from "@/components/PatientForm/FormHeader";
import FormNavigation from "@/components/PatientForm/FormNavigation";
import FormStepContent from "@/components/PatientForm/FormStepContent";
import { SingleQuestionLayout } from "@/components/PatientForm/SingleQuestionLayout";
import { LegalConsentStep } from "@/components/Legal/LegalConsentStep";
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
    goToStep,
    canNavigateToStep,
    completedSteps,
    isSubmitting,
    handleSubmit,
    form,
    visibleFieldIds,
    showConsentStep,
    consentGiven,
    onConsentChange,
    setShowConsentStep
  } = useFormContext();

  // Detect if user is on mobile/iPad (screens smaller than 1024px)
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Add state to track step transitions for animations
  const [animatingStep, setAnimatingStep] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [previousStepValue, setPreviousStepValue] = useState(currentStep);
  
  // Track which fields have been touched to avoid premature validation
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  // Run animation when step changes
  useEffect(() => {
    if (previousStepValue !== currentStep) {
      // Start exit animation
      setAnimatingStep(true);
      setAnimationClass("page-transition-exit");
      
      // After exit animation completes, start enter animation
      setTimeout(() => {
        setPreviousStepValue(currentStep);
        setAnimationClass("page-transition-enter");
        
        // Clear animation class after enter animation completes
        setTimeout(() => {
          setAnimatingStep(false);
          setAnimationClass("");
        }, 300);
      }, 200);
    }
  }, [currentStep, previousStepValue]);

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
      // console.log("[FormLayout] Dynamic follow-up values:", dynamicValues);
    }
  }, [watchedValues]);

  // Track field interactions to prevent premature validation
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name) {
        setTouchedFields(prev => new Set([...prev, name]));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // The onSubmit handler now only prevents default behavior but doesn't trigger submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // console.log("[FormLayout/onSubmit]: Form submit event intercepted and prevented");
  };

  // Enhanced submit handler with better error handling and conditional validation
  const handleFormSubmission = () => {
    console.log("[FormLayout/handleFormSubmission]: Starting form submission process");
    
    try {
      // Get all current form values
      const formValues = form.getValues();
      console.log("[FormLayout/handleFormSubmission]: Current form values for submission:", formValues);
      
      // Count dynamic follow-up values
      const dynamicValues = Object.keys(formValues).filter(key => key.includes('_for_'));
      console.log("[FormLayout/handleFormSubmission]: Found", dynamicValues.length, "dynamic follow-up values");
      
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
          }
        }, 1000);
      }
    } catch (error) {
      console.error("[FormLayout/handleFormSubmission]: Unexpected error during form submission:", error);
      toast.error("Ett oväntat fel uppstod");
    }
  };

  // Use single question layout for mobile/iPad, traditional layout for desktop
  if (isMobileView) {
    return <SingleQuestionLayout createdByName={createdByName} />;
  }

  // Show consent step if needed
  if (showConsentStep) {
    return (
      <LegalConsentStep
        consentGiven={consentGiven}
        onConsentChange={onConsentChange}
        onContinue={() => setShowConsentStep(false)}
        organizationName="din optiker"
      />
    );
  }

  return (
    <>
      <FormHeader 
        currentStep={currentStep}
        totalSteps={totalSections}
        progress={progress}
        createdByName={createdByName}
        visibleSections={visibleSections}
        onSectionClick={goToStep}
        completedSteps={completedSteps}
        canNavigateToStep={canNavigateToStep}
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
            aria-live="polite"
          >
            Steg {currentStep + 1} av {totalSections}
          </div>
          
          <div className={`transition-all ${animationClass}`}>
            {visibleSections.length > 0 && currentStep < visibleSections.length && (
              <FormStepContent 
                sections={visibleSections[currentStep]} 
                currentValues={watchedValues}
              />
            )}
          </div>
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
