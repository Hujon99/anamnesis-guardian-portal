
/**
 * This component displays a loading state with optional retry functionality.
 * It supports a minimum display time to prevent UI flashing, and can show
 * different states based on whether form data is ready.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface LoadingCardProps {
  onRetry?: () => void;
  minDisplayTime?: number;
  isFormDataReady?: boolean;
  message?: string;
}

const LoadingCard: React.FC<LoadingCardProps> = ({
  onRetry,
  minDisplayTime = 1000,
  isFormDataReady = false,
  message = "Laddar formulär..."
}) => {
  const [shouldShow, setShouldShow] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  // Ensure the loading indicator is shown for at least minDisplayTime
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldShow(false);
    }, minDisplayTime);
    
    // Show retry button if loading takes too long
    const retryTimer = setTimeout(() => {
      if (onRetry) {
        setShowRetry(true);
      }
    }, 10000); // Show retry after 10 seconds
    
    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
  }, [minDisplayTime, onRetry]);

  // If minDisplayTime has passed and we don't want to show anymore, null
  if (!shouldShow && !isFormDataReady) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-3xl bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-medium mb-2">{message}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {isFormDataReady ? "Förbereder formulär..." : "Hämtar information..."}
          </p>
          
          {showRetry && onRetry && (
            <Button 
              variant="outline" 
              onClick={onRetry} 
              className="mt-4"
            >
              Försök igen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingCard;
