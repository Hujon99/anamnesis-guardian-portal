
/**
 * This component properly displays dynamic follow-up question values.
 * It extracts and renders the actual value from the complex nested answer objects
 * that are used for dynamic follow-up questions.
 */

import React from 'react';

interface DynamicValueRendererProps {
  value: any;
}

export const DynamicValueRenderer: React.FC<DynamicValueRendererProps> = ({ value }) => {
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

  const displayValue = extractValue(value);
  
  // Handle different types of values
  if (Array.isArray(displayValue)) {
    return <>{displayValue.join(', ')}</>;
  }
  
  if (typeof displayValue === 'boolean') {
    return <>{displayValue ? 'Ja' : 'Nej'}</>;
  }
  
  if (displayValue === null || displayValue === undefined) {
    return <span className="text-muted-foreground italic">Inget svar</span>;
  }
  
  return <>{displayValue}</>;
};
