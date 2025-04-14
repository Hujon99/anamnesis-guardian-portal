
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
  // Check if this is a dynamic follow-up answer object
  if (value && typeof value === 'object' && 'value' in value) {
    // Extract and return just the value from the nested structure
    return <>{value.value}</>;
  }
  
  // For arrays, join them with commas
  if (Array.isArray(value)) {
    return <>{value.join(', ')}</>;
  }
  
  // For boolean values, convert to Yes/No
  if (typeof value === 'boolean') {
    return <>{value ? 'Ja' : 'Nej'}</>;
  }
  
  // For normal values, just return as is
  return <>{value}</>;
};
