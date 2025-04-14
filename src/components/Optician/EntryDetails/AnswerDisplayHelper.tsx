
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
    if (val && typeof val === 'object') {
      // Handle answer object with nested value structure
      if ('answer' in val && typeof val.answer === 'object') {
        return extractValue(val.answer);
      }
      // Handle direct value property
      if ('value' in val) {
        return val.value;
      }
    }
    return val;
  };

  // Get the actual value to display
  const displayValue = extractValue(answer);

  // Handle null/undefined
  if (displayValue === null || displayValue === undefined) {
    return <span className={`text-muted-foreground italic ${className}`}>Inget svar</span>;
  }

  // Handle arrays
  if (Array.isArray(displayValue)) {
    return <span className={className}>{displayValue.join(', ')}</span>;
  }

  // Handle booleans
  if (typeof displayValue === 'boolean') {
    return <span className={className}>{displayValue ? 'Ja' : 'Nej'}</span>;
  }

  // Default case: display as string
  return <span className={className}>{String(displayValue)}</span>;
};
