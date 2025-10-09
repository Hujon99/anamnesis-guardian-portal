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
      // Reset run first to ensure clean state
      setRun(false);
      // Then start tour with delay to ensure DOM elements are ready
      const timer = setTimeout(() => setRun(true), 300);
      return () => clearTimeout(timer);
    } else {
      setRun(false);
    }
  }, [isOnboardingComplete, isLoading, currentStep]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action, step } = data;

    // Log for debugging
    console.log('Joyride callback:', { status, type, index, action, target: step.target });

    // Handle errors - if step target not found, skip to next
    if (status === STATUS.ERROR) {
      console.warn('Joyride error - target not found:', step.target);
      // Skip to next step if possible
      if (index < getTourSteps(isOptician ?? false, isAdmin ?? false).length - 1) {
        setTimeout(() => updateStep(index + 1), 100);
      }
      return;
    }

    // User finished or skipped the tour
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeOnboarding();
      setRun(false);
      return;
    }

    // Update step when moving forward/backward
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT || action === ACTIONS.PREV) {
        // Add small delay to let DOM update before moving to next step
        setTimeout(() => {
          updateStep(index + 1);
        }, 150);
      }
    }

    // User closed the tour (allow resuming)
    if (action === ACTIONS.CLOSE) {
      updateStep(index);
      setRun(false);
    }
  }, [completeOnboarding, updateStep, isOptician, isAdmin]);

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
      disableOverlayClose
      spotlightClicks={false}
      scrollToFirstStep={false}
      scrollOffset={120}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(210 100% 40%)', // --primary from design system
          textColor: 'hsl(222.2 84% 4.9%)', // --foreground
          backgroundColor: 'hsl(0 0% 100%)', // --background
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          arrowColor: 'hsl(0 0% 100%)',
          zIndex: 10000,
        },
        overlay: {
          transition: 'opacity 0.3s ease-in-out',
        },
        tooltip: {
          borderRadius: '0.75rem',
          padding: '1.5rem',
          transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
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
          transition: 'all 0.2s ease',
        },
        buttonBack: {
          color: 'hsl(210 100% 40%)',
          marginRight: '0.5rem',
          transition: 'all 0.2s ease',
        },
        buttonSkip: {
          color: 'hsl(215.4 16.3% 46.9%)', // --muted-foreground
          transition: 'all 0.2s ease',
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
        hideArrow: false,
        offset: 10,
        styles: {
          floater: {
            transition: 'opacity 0.3s ease-in-out',
          },
        },
      }}
    />
  );
};
