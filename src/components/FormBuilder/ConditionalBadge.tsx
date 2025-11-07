/**
 * Conditional Badge Component
 * Displays a badge showing that a question controls other questions through conditional logic.
 * Provides visual feedback about parent-child relationships in the form hierarchy.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

interface ConditionalBadgeProps {
  childrenCount: number;
  className?: string;
}

export const ConditionalBadge: React.FC<ConditionalBadgeProps> = ({ 
  childrenCount,
  className 
}) => {
  if (childrenCount === 0) return null;
  
  return (
    <Badge 
      variant="secondary" 
      className={`gap-1 bg-accent/20 text-accent border-accent/30 ${className || ''}`}
    >
      <GitBranch className="h-3 w-3" />
      Styr {childrenCount} {childrenCount === 1 ? 'fråga' : 'frågor'}
    </Badge>
  );
};
