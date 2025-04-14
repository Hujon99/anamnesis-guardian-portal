
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
  // Handle null/undefined
  if (answer === null || answer === undefined) {
    return <span className={`text-muted-foreground italic ${className}`}>Inget svar</span>;
  }

  // Handle dynamic follow-up questions (object with value property)
  if (typeof answer === 'object' && !Array.isArray(answer) && answer.value !== undefined) {
    return <span className={className}>{answer.value}</span>;
  }

  // Handle arrays (like checkbox answers)
  if (Array.isArray(answer)) {
    return <span className={className}>{answer.join(', ')}</span>;
  }

  // Handle booleans
  if (typeof answer === 'boolean') {
    return <span className={className}>{answer ? 'Ja' : 'Nej'}</span>;
  }

  // Handle objects that don't have a 'value' property
  if (typeof answer === 'object' && !Array.isArray(answer)) {
    return <span className={`text-muted-foreground italic ${className}`}>[Komplext objekt]</span>;
  }

  // Default case: display as string
  return <span className={className}>{answer.toString()}</span>;
};
