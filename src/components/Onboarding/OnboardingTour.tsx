/**
 * Onboarding tour component using react-joyride.
 * Provides an interactive guided tour for new users showing key features.
 * Tour progress is persisted to database and can be resumed.
 */

import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useUserRole } from '@/hooks/useUserRole';
import { getTourSteps } from './tourSteps';

export const OnboardingTour: React.FC = () => {
  const { isOnboardingComplete, currentStep, isLoading, completeOnboarding, updateStep } = useOnboarding();
  const { isOptician, isAdmin } = useUserRole();
  const [run, setRun] = React.useState(false);

  // Start tour when onboarding is not complete
  React.useEffect(() => {
    if (!isLoading && isOnboardingComplete === false) {
      // Small delay to ensure DOM elements are ready
      setTimeout(() => setRun(true), 100);
    } else {
      setRun(false);
    }
  }, [isOnboardingComplete, isLoading]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

    // User finished or skipped the tour
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeOnboarding();
      setRun(false);
      return;
    }

    // Update step when moving forward/backward
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT || action === ACTIONS.PREV) {
        updateStep(index + 1);
      }
    }

    // User closed the tour (allow resuming)
    if (action === ACTIONS.CLOSE) {
      updateStep(index);
      setRun(false);
    }
  }, [completeOnboarding, updateStep]);

  // Don't render while loading
  if (isLoading || isOnboardingComplete === null) {
    return null;
  }

  // Don't show tour if already completed
  if (isOnboardingComplete) {
    return null;
  }

  const steps = getTourSteps(isOptician ?? false, isAdmin ?? false);

  return (
    <Joyride
      steps={steps}
      stepIndex={currentStep}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(210 100% 40%)', // --primary from design system
          textColor: 'hsl(222.2 84% 4.9%)', // --foreground
          backgroundColor: 'hsl(0 0% 100%)', // --background
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(0 0% 100%)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '0.75rem',
          padding: '1.5rem',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'hsl(210 100% 40%)',
          color: 'white',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(210 100% 40%)',
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: 'hsl(215.4 16.3% 46.9%)', // --muted-foreground
        },
      }}
      locale={{
        back: 'Tillbaka',
        close: 'Stäng',
        last: 'Avsluta',
        next: 'Nästa',
        skip: 'Hoppa över',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};
