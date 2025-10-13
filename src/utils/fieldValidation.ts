/**
 * Utility functions for validating form field values.
 * 
 * This file provides shared validation logic to ensure that form values
 * are appropriate for their corresponding questions. Used by both the
 * rendering logic (TouchFriendlyFieldRenderer) and the answer validation
 * logic (SingleQuestionLayout) to prevent answer leakage between questions.
 */

import { FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";

/**
 * Validates that a field value is appropriate for a given question.
 * Returns true if the value is valid or empty, false if it's inappropriate.
 * 
 * This prevents values from one question from "leaking" to another question
 * when navigating through a multi-step form.
 */
export const validateFieldValue = (
  value: any,
  question: FormQuestion | DynamicFollowupQuestion
): boolean => {
  // Empty values are always valid (no value to validate)
  if (!value || value === "" || value === undefined || value === null) return true;
  
  // For radio/dropdown questions with options, ensure value is in valid options
  if ((question.type === "radio" || question.type === "dropdown") && question.options) {
    const validOptions = question.options.map(option => 
      typeof option === 'string' ? option : option.value
    );
    return validOptions.includes(value);
  }
  
  // For checkbox questions, ensure all values are valid options
  if (question.type === "checkbox" && question.options && Array.isArray(value)) {
    const validOptions = question.options.map(option => 
      typeof option === 'string' ? option : option.value
    );
    return value.every(v => validOptions.includes(v));
  }
  
  // For number fields, ensure value is numeric
  if (question.type === "number") {
    return !isNaN(Number(value));
  }
  
  // For all other types, any non-empty value is valid
  return true;
};
