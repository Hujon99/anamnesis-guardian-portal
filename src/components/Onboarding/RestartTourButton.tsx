/**
 * Button component for restarting the onboarding tour.
 * Can be placed in settings or sidebar to allow users to view the guide again.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';

interface RestartTourButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const RestartTourButton: React.FC<RestartTourButtonProps> = ({ 
  variant = 'outline', 
  size = 'default',
  className
}) => {
  const { restartOnboarding } = useOnboarding();
  const navigate = useNavigate();

  const handleClick = async () => {
    await restartOnboarding();
    // Small delay to ensure state propagates before navigation
    await new Promise(resolve => setTimeout(resolve, 100));
    // Navigate to dashboard where OnboardingTour is rendered
    navigate('/dashboard');
    // Force a page reload to ensure clean state
    window.location.reload();
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleClick}
      className={className || "gap-2 w-full justify-start"}
    >
      <Play className="h-4 w-4" />
      <span className="group-data-[collapsible=icon]:hidden">Visa guide igen</span>
    </Button>
  );
};
