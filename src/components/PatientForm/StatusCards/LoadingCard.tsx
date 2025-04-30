
/**
 * This component displays a loading state for the patient form.
 * It shows a spinner and loading message while the form is being loaded.
 * Enhanced with a timer to show extended messages for long loading times,
 * a minimum display time to prevent flashing, and a retry button for cases
 * where loading takes too long.
 */

import React, { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingCardProps {
  onRetry?: () => void;
  minDisplayTime?: number; // Added prop for minimum display time
  isFormDataReady?: boolean; // Flag to indicate if data is ready but still showing loading for min time
}

const LoadingCard: React.FC<LoadingCardProps> = ({ 
  onRetry,
  minDisplayTime = 1500, // Increased default minimum display time to reduce flickering
  isFormDataReady = false
}) => {
  const [loadingTime, setLoadingTime] = useState(0);
  const [canHide, setCanHide] = useState(false);
  const minTimeElapsedRef = useRef(false);
  
  useEffect(() => {
    console.log("[LoadingCard]: Mounted with minDisplayTime:", minDisplayTime, "isFormDataReady:", isFormDataReady);
    
    // Set up timer for loading messages
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    // Set up minimum display timer
    const minDisplayTimer = setTimeout(() => {
      console.log("[LoadingCard]: Minimum display time elapsed");
      minTimeElapsedRef.current = true;
      setCanHide(true);
    }, minDisplayTime);
    
    return () => {
      console.log("[LoadingCard]: Unmounted after", loadingTime, "seconds");
      clearInterval(timer);
      clearTimeout(minDisplayTimer);
    };
  }, [minDisplayTime]);
  
  // Show additional messaging if loading takes longer than expected
  const getLoadingMessage = () => {
    if (isFormDataReady) {
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
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md w-full">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-gray-600">{getLoadingMessage()}</p>
        
        {/* Loading indicators to make the transition smoother */}
        {loadingTime >= 3 && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-2 w-3/4 mx-auto" />
            <Skeleton className="h-2 w-1/2 mx-auto" />
          </div>
        )}
        
        {/* Display debug info for loading state */}
        {loadingTime >= 10 && (
          <div className="mt-3 text-xs text-gray-400">
            {isFormDataReady ? "Väntar på att visa formuläret..." : "Väntar på formulärdata..."}
          </div>
        )}
        
        {loadingTime >= 15 && onRetry && (
          <div className="mt-6">
            <Button onClick={onRetry} variant="outline" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
          </div>
        )}
        
        {loadingTime >= 20 && !onRetry && (
          <div className="mt-4 text-xs text-gray-500">
            Prova att ladda om sidan om detta problem kvarstår.
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingCard;
