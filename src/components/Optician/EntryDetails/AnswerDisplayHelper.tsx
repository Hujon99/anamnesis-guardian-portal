
/**
 * This helper component displays form answers with special handling for
 * dynamic follow-up questions, complex answer formats, and multiple driving license categories.
 * It extracts and renders the actual values from nested structures.
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";

interface AnswerDisplayHelperProps {
  answer: any;
  className?: string;
  questionId?: string;
}

export const AnswerDisplayHelper: React.FC<AnswerDisplayHelperProps> = ({ 
  answer, 
  className = "",
  questionId
}) => {
  // Extract value from nested object structure
  const extractValue = (val: any): any => {
    // Handle undefined/null
    if (val === undefined || val === null) {
      return val;
    }

    // If it's an array, map over it and extract each value
    if (Array.isArray(val)) {
      return val.map(item => extractValue(item));
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

  // Special handling for driving license categories (multiple selection)
  const isDrivingLicenseQuestion = questionId && (
    questionId.toLowerCase().includes('behörighet') ||
    questionId.toLowerCase().includes('license') ||
    questionId.toLowerCase().includes('körkortstyp')
  );

  // If it's an array of license categories, show with special formatting
  if (isDrivingLicenseQuestion && Array.isArray(displayValue) && displayValue.length > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex flex-wrap gap-1">
          {displayValue.map((category: string, index: number) => (
            <Badge 
              key={index}
              variant="secondary" 
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              {category}
            </Badge>
          ))}
        </div>
        <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
          ⚠️ Flera behörigheter valda
        </div>
      </div>
    );
  }

  // If it's an array, join the values
  if (Array.isArray(displayValue)) {
    return <span className={className}>{displayValue.join(', ')}</span>;
  }

  // Default case: display as string
  return <span className={className}>{String(displayValue)}</span>;
};

