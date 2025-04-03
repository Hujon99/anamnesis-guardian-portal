
/**
 * This hook manages multi-step form navigation and progress tracking.
 * It handles step transitions, tracks completion progress, and maintains
 * the current active step state.
 */

import { useState, useCallback } from "react";

interface UseMultiStepFormProps {
  totalSteps: number;
  initialStep?: number;
}

export function useMultiStepForm({ totalSteps, initialStep = 0 }: UseMultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0); // Scroll to top for the new step
      return true;
    }
    return false;
  }, [currentStep, totalSteps]);
  
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0); // Scroll to top for the new step
      return true;
    }
    return false;
  }, [currentStep]);
  
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
      window.scrollTo(0, 0); // Scroll to top for the new step
      return true;
    }
    return false;
  }, [totalSteps]);
  
  const calculateProgress = useCallback(() => {
    if (totalSteps === 0) return 0;
    const progress = (currentStep / totalSteps) * 100;
    return Math.min(Math.round(progress), 100);
  }, [currentStep, totalSteps]);
  
  return {
    currentStep,
    nextStep,
    previousStep,
    goToStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    calculateProgress,
    totalSteps
  };
}
