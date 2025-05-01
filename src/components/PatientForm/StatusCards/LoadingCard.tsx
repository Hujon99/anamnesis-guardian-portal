
/**
 * This component displays a loading state for the patient form.
 * It shows a spinner and loading message while the form is being loaded.
 * Enhanced with a timer to show extended messages for long loading times,
 * a minimum display time to prevent flashing, a retry button for cases
 * where loading takes too long, and a smooth transition mechanism.
 */

import React, { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingCardProps {
  onRetry?: () => void;
  minDisplayTime?: number; // Added prop for minimum display time
  isFormDataReady?: boolean; // Flag to indicate if data is ready but still showing loading for min time
  message?: string; // Added message prop to allow custom loading messages
}

const LoadingCard: React.FC<LoadingCardProps> = ({ 
  onRetry,
  minDisplayTime = 2000, // Increased minimum display time to reduce flickering
  isFormDataReady = false,
  message // Added message parameter
}) => {
  const [loadingTime, setLoadingTime] = useState(0);
  const [canHide, setCanHide] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // New state for transition phase
  const minTimeElapsedRef = useRef(false);
  const dataReadyAcknowledgedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const unmountingRef = useRef(false);
  
  useEffect(() => {
    console.log("[LoadingCard]: Mounted with minDisplayTime:", minDisplayTime, "isFormDataReady:", isFormDataReady);
    unmountingRef.current = false;
    
    // Set up timer for loading messages
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    // Set up minimum display timer
    const minDisplayTimer = setTimeout(() => {
      console.log("[LoadingCard]: Minimum display time elapsed");
      minTimeElapsedRef.current = true;
      
      // Only allow hiding if both conditions are met
      if (isFormDataReady || dataReadyAcknowledgedRef.current) {
        console.log("[LoadingCard]: Both min time elapsed AND data ready, can transition now");
        setCanHide(true);
        startTransition();
      } else {
        console.log("[LoadingCard]: Min time elapsed but still waiting for data to be ready");
      }
    }, minDisplayTime);
    
    return () => {
      console.log("[LoadingCard]: Unmounting after", loadingTime, "seconds, isTransitioning:", isTransitioning);
      unmountingRef.current = true;
      clearInterval(timer);
      clearTimeout(minDisplayTimer);
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [minDisplayTime]);
  
  // Handle form data readiness changes
  useEffect(() => {
    console.log("[LoadingCard]: isFormDataReady prop changed to:", isFormDataReady);
    
    if (isFormDataReady && !dataReadyAcknowledgedRef.current) {
      console.log("[LoadingCard]: Form data ready signal received");
      dataReadyAcknowledgedRef.current = true;
      
      // If min time already elapsed, we can transition
      if (minTimeElapsedRef.current) {
        console.log("[LoadingCard]: Data ready and min time already elapsed, can transition now");
        setCanHide(true);
        startTransition();
      } else {
        console.log("[LoadingCard]: Data ready but waiting for min time to elapse");
      }
    }
  }, [isFormDataReady]);
  
  // Start transition with a small delay to allow for smooth state changes
  const startTransition = () => {
    if (isTransitioning || unmountingRef.current) {
      console.log("[LoadingCard]: Already transitioning or unmounting, skipping transition start");
      return;
    }
    
    setIsTransitioning(true);
    console.log("[LoadingCard]: Starting transition phase");
    
    // Add a small buffer time for the transition
    transitionTimeoutRef.current = window.setTimeout(() => {
      if (unmountingRef.current) {
        console.log("[LoadingCard]: Component unmounted during transition, aborting");
        return;
      }
      
      console.log("[LoadingCard]: Transition complete, ready for unmounting");
      // The parent component will use the canHide state to unmount this component
    }, 300); // Short transition period
  };
  
  // Show additional messaging if loading takes longer than expected
  const getLoadingMessage = () => {
    // Use the custom message if provided
    if (message) {
      return message;
    } else if (isTransitioning) {
      return "Visar formuläret...";
    } else if (isFormDataReady || dataReadyAcknowledgedRef.current) {
      return "Förbereder formuläret...";
    } else if (loadingTime < 5) {
      return "Laddar formulär...";
    } else if (loadingTime < 10) {
      return "Hämtar formulärmall...";
    } else if (loadingTime < 20) {
      return "Detta tar längre tid än vanligt...";
    } else {
      return "Problem med att läsa in formuläret. Du kan försöka igen.";
    }
  };
  
  // Add debug console log for rendering
  console.log(`[LoadingCard/RENDER]: Rendering with loadingTime=${loadingTime}, isTransitioning=${isTransitioning}, canHide=${canHide}`);
  
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md w-full">
        <Loader2 className={`h-8 w-8 animate-spin mx-auto ${isTransitioning ? 'text-success' : 'text-primary'}`} />
        <p className="mt-4 text-gray-600">{getLoadingMessage()}</p>
        
        {/* Loading indicators to make the transition smoother */}
        {loadingTime >= 3 && !isTransitioning && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-2 w-3/4 mx-auto" />
            <Skeleton className="h-2 w-1/2 mx-auto" />
          </div>
        )}
        
        {/* Display debug info for loading state */}
        {loadingTime >= 10 && !isTransitioning && (
          <div className="mt-3 text-xs text-gray-400">
            {isFormDataReady ? "Väntar på att visa formuläret..." : "Väntar på formulärdata..."}
          </div>
        )}
        
        {loadingTime >= 15 && onRetry && !isTransitioning && (
          <div className="mt-6">
            <Button onClick={onRetry} variant="outline" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
          </div>
        )}
        
        {loadingTime >= 20 && !onRetry && !isTransitioning && (
          <div className="mt-4 text-xs text-gray-500">
            Prova att ladda om sidan om detta problem kvarstår.
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingCard;
