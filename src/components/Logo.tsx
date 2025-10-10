/**
 * Logo component for Anamnesportalen
 * Renders a text-based logo with color split effect:
 * - "Anamnes" in dark gray
 * - "portalen" in primary blue
 * Inspired by the elegant two-tone design pattern
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl md:text-5xl',
  };

  return (
    <h1 className={cn('font-semibold tracking-tight', sizeClasses[size], className)}>
      <span className="text-foreground/80">Anamnes</span>
      <span className="text-primary">portalen</span>
    </h1>
  );
};
