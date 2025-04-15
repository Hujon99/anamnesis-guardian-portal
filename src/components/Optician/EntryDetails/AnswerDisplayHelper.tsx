
/**
 * This helper component displays form answers with special handling for
 * dynamic follow-up questions and complex answer formats.
 * It extracts and renders the actual values from nested structures.
 */

import React from 'react';

interface AnswerDisplayHelperProps {
  answer: any;
  className?: string;
}

export const AnswerDisplayHelper: React.FC<AnswerDisplayHelperProps> = ({ 
  answer, 
  className = "" 
}) => {
  // Extract value from nested object structure
  const extractValue = (val: any): any => {
    // Handle undefined/null
    if (val === undefined || val === null) {
      return val;
    }

    // If it's an array, map over it and extract each value
    if (Array.isArray(val)) {
      return val.map(item => extractValue(item)).join(', ');
    }

    // If it's an object with a value property (follow-up question structure)
    if (typeof val === 'object' && 'value' in val) {
      return val.value;
    }

    // If it's a simple value, return as is
    return val;
  };

  // Get the actual value to display
  const displayValue = extractValue(answer);

  // Handle null/undefined
  if (displayValue === null || displayValue === undefined) {
    return <span className={`text-muted-foreground italic ${className}`}>Inget svar</span>;
  }

  // Default case: display as string
  return <span className={className}>{String(displayValue)}</span>;
};

