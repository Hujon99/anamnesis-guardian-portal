/**
 * Button component for restarting the onboarding tour.
 * Can be placed in settings or sidebar to allow users to view the guide again.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface RestartTourButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const RestartTourButton: React.FC<RestartTourButtonProps> = ({ 
  variant = 'outline', 
  size = 'default' 
}) => {
  const { restartOnboarding } = useOnboarding();

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={restartOnboarding}
      className="gap-2"
    >
      <Play className="h-4 w-4" />
      Visa guide igen
    </Button>
  );
};
