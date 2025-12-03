/**
 * Hook for managing onboarding tour state.
 * Tracks whether user has completed onboarding and which step they're on.
 * Syncs with Supabase users table for persistence.
 * 
 * Includes 7-day cooldown when user dismisses (closes) the tour without completing.
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const DISMISS_COOLDOWN_DAYS = 7;

export const useOnboarding = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const { supabase, isReady } = useSupabaseClient();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  // Check if cooldown period has passed since dismissal
  const isCooldownActive = (dismissedAtTimestamp: string | null): boolean => {
    if (!dismissedAtTimestamp) return false;
    
    const dismissedDate = new Date(dismissedAtTimestamp);
    const now = new Date();
    const daysSinceDismissal = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceDismissal < DISMISS_COOLDOWN_DAYS;
  };

  // Fetch onboarding status from database
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!user?.id || !isReady || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[useOnboarding]: Fetching status with authenticated client');
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_completed, onboarding_step, onboarding_dismissed_at')
          .eq('clerk_user_id', user.id)
          .single();

        if (error) {
          console.error('[useOnboarding]: Error fetching status:', error);
          setIsOnboardingComplete(false);
          setCurrentStep(0);
        } else if (data) {
          const completed = data.onboarding_completed ?? false;
          const dismissed = data.onboarding_dismissed_at;
          
          // If not completed but dismissed within cooldown, treat as complete (don't show)
          const shouldHide = completed || isCooldownActive(dismissed);
          
          setIsOnboardingComplete(shouldHide);
          setCurrentStep(data.onboarding_step ?? 0);
          setDismissedAt(dismissed);
          
          if (dismissed && isCooldownActive(dismissed)) {
            console.log('[useOnboarding]: Tour dismissed, cooldown active until', 
              new Date(new Date(dismissed).getTime() + DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000));
          }
        }
      } catch (err) {
        console.error('[useOnboarding]: Unexpected error:', err);
        setIsOnboardingComplete(false);
        setCurrentStep(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, [user?.id, isReady, supabase]);

  // Mark onboarding as complete
  const completeOnboarding = async (retryCount = 0) => {
    if (!user?.id || !supabase) {
      console.error('[useOnboarding]: Missing user or supabase client');
      return;
    }

    try {
      console.log('[useOnboarding]: Attempting to mark onboarding as complete with authenticated client...');
      
      const { error, data } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 0,
          onboarding_dismissed_at: null // Clear dismissal when properly completed
        })
        .eq('clerk_user_id', user.id)
        .select();

      // Check if update was blocked by RLS (empty data array)
      if (!error && (!data || data.length === 0)) {
        console.error('[useOnboarding]: Update blocked - no rows affected (likely RLS issue)');
        toast({
          title: "Kunde inte spara",
          description: "Databasuppdateringen blockerades. Kontrollera behörigheter.",
          variant: "destructive",
        });
        return;
      }

      if (error) {
        console.error('[useOnboarding]: Error completing onboarding:', error);
        console.error('[useOnboarding]: Error details:', JSON.stringify(error, null, 2));
        
        // Retry once after 500ms
        if (retryCount < 1) {
          console.log('[useOnboarding]: Retrying...');
          setTimeout(() => completeOnboarding(retryCount + 1), 500);
          return;
        }
        
        toast({
          title: "Kunde inte spara",
          description: error.message || "Ett fel uppstod när onboarding skulle sparas.",
          variant: "destructive",
        });
        return;
      }

      console.log('[useOnboarding]: Successfully completed onboarding', data);
      setIsOnboardingComplete(true);
      setCurrentStep(0);
      setDismissedAt(null);
      
      toast({
        title: "Välkommen!",
        description: "Guiden är nu klar. Du kan börja använda systemet.",
      });
    } catch (err) {
      console.error('[useOnboarding]: Unexpected error:', err);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till databasen. Försök igen.",
        variant: "destructive",
      });
    }
  };

  // Dismiss onboarding (close without completing) - sets 7-day cooldown
  const dismissOnboarding = async (currentStepIndex: number) => {
    if (!user?.id || !supabase) return;

    try {
      console.log('[useOnboarding]: Dismissing tour with 7-day cooldown');
      
      const { error, data } = await supabase
        .from('users')
        .update({ 
          onboarding_step: currentStepIndex,
          onboarding_dismissed_at: new Date().toISOString()
        })
        .eq('clerk_user_id', user.id)
        .select();

      if (!error && (!data || data.length === 0)) {
        console.error('[useOnboarding]: Dismiss blocked - no rows affected');
        return;
      }

      if (error) {
        console.error('[useOnboarding]: Error dismissing onboarding:', error);
        return;
      }

      console.log('[useOnboarding]: Tour dismissed, will show again in 7 days');
      setIsOnboardingComplete(true); // Hide the tour
      setCurrentStep(currentStepIndex);
      setDismissedAt(new Date().toISOString());
    } catch (err) {
      console.error('[useOnboarding]: Unexpected error:', err);
    }
  };

  // Update current step (for resuming)
  const updateStep = async (step: number) => {
    if (!user?.id || !supabase) return;

    try {
      const { error, data } = await supabase
        .from('users')
        .update({ onboarding_step: step })
        .eq('clerk_user_id', user.id)
        .select();

      if (!error && (!data || data.length === 0)) {
        console.error('[useOnboarding]: Step update blocked - no rows affected');
        return;
      }

      if (error) {
        console.error('[useOnboarding]: Error updating step:', error);
        return;
      }

      setCurrentStep(step);
    } catch (err) {
      console.error('[useOnboarding]: Unexpected error:', err);
    }
  };

  // Restart onboarding
  const restartOnboarding = async () => {
    if (!user?.id || !supabase) return;

    try {
      const { error, data } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: false,
          onboarding_step: 0,
          onboarding_dismissed_at: null // Clear dismissal timestamp
        })
        .eq('clerk_user_id', user.id)
        .select();

      if (!error && (!data || data.length === 0)) {
        console.error('[useOnboarding]: Restart blocked - no rows affected');
        toast({
          title: "Kunde inte återställa",
          description: "Databasuppdateringen blockerades.",
          variant: "destructive",
        });
        return;
      }

      if (error) {
        console.error('[useOnboarding]: Error restarting onboarding:', error);
        toast({
          title: "Kunde inte återställa",
          description: "Ett fel uppstod när guiden skulle återställas.",
          variant: "destructive",
        });
        return;
      }

      setIsOnboardingComplete(false);
      setCurrentStep(0);
      setDismissedAt(null);
      
      toast({
        title: "Guiden återställd",
        description: "Välkomstguiden kommer att visas igen.",
      });
    } catch (err) {
      console.error('[useOnboarding]: Unexpected error:', err);
    }
  };

  return {
    isOnboardingComplete,
    currentStep,
    isLoading,
    completeOnboarding,
    dismissOnboarding,
    updateStep,
    restartOnboarding,
  };
};
