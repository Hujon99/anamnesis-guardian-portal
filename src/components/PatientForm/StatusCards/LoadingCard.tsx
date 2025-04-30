
/**
 * This component displays a loading state for the patient form.
 * It shows a spinner and loading message while the form is being loaded.
 * Enhanced with a timer to show extended messages for long loading times
 * and a retry button for cases where loading takes too long.
 */

import React, { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingCardProps {
  onRetry?: () => void;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ onRetry }) => {
  const [loadingTime, setLoadingTime] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Show additional messaging if loading takes longer than expected
  const getLoadingMessage = () => {
    if (loadingTime < 5) {
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
      <div className="text-center p-6 bg-white rounded-lg shadow-md">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-gray-600">{getLoadingMessage()}</p>
        
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
