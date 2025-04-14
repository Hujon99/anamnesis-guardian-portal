
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
  // Check if this is a dynamic follow-up answer object with a nested structure
  if (value && typeof value === 'object') {
    // First, check if it has a direct 'value' property (most common case)
    if ('value' in value) {
      return <>{value.value}</>;
    }
    
    // If it's an answer object with parent_question, parent_value, and value
    if ('parent_value' in value && 'parent_question' in value && 'value' in value) {
      return <>{value.value}</>;
    }
    
    // For other objects, try to stringify them
    try {
      return <span className="text-amber-600">[Komplext objekt]</span>;
    } catch (e) {
      return <span className="text-red-500">[Oläsligt objekt]</span>;
    }
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
