
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
    // Handle undefined/null
    if (val === undefined || val === null) {
      return val;
    }

    // If it's an object, try to extract the value
    if (typeof val === 'object') {
      // Handle dynamic follow-up answer format
      if ('value' in val) {
        return val.value;
      }
      // Handle legacy answer format
      if ('answer' in val) {
        return extractValue(val.answer);
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
