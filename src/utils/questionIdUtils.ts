/**
 * Utility functions for generating and parsing question IDs,
 * especially for dynamic follow-up questions.
 * 
 * This module ensures consistent ID generation across the application,
 * preventing invalid field names that can cause database save issues.
 */

/**
 * Sanitizes a string value to be used as part of a field ID.
 * Removes or replaces characters that would be problematic in database field names.
 * 
 * @param value - The raw string value (e.g., "Gråstarr-operation (Kataraktoperation)")
 * @returns Sanitized string (e.g., "Grastarr_operation_Kataraktoperation")
 */
export const sanitizeForFieldId = (value: string): string => {
  return value
    // Replace Swedish characters
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/Å/g, 'A')
    .replace(/Ä/g, 'A')
    .replace(/Ö/g, 'O')
    // Remove or replace special characters
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[.,;:!?]/g, '') // Remove punctuation
    .replace(/[-–—]/g, '_') // Replace dashes with underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove any remaining special chars
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim underscores from start/end
};

/**
 * Generates a runtime ID for a dynamic follow-up question.
 * 
 * @param questionId - The base question template ID (e.g., "ögonoperation_när")
 * @param parentValue - The parent value that triggered this follow-up (e.g., "Gråstarr-operation (Kataraktoperation)")
 * @returns A sanitized runtime ID (e.g., "ogonoperation_nar_for_Grastarr_operation_Kataraktoperation")
 */
export const generateRuntimeId = (questionId: string, parentValue: string): string => {
  const sanitizedQuestionId = sanitizeForFieldId(questionId);
  const sanitizedParentValue = sanitizeForFieldId(parentValue);
  return `${sanitizedQuestionId}_for_${sanitizedParentValue}`;
};

/**
 * Extracts the original question ID from a runtime ID.
 * 
 * @param runtimeId - The runtime ID (e.g., "ogonoperation_nar_for_Grastarr_operation")
 * @returns The original question ID (e.g., "ogonoperation_nar")
 */
export const getOriginalQuestionId = (runtimeId: string): string => {
  if (runtimeId.includes('_for_')) {
    return runtimeId.split('_for_')[0];
  }
  return runtimeId;
};

/**
 * Extracts the parent value from a runtime ID (approximate reconstruction).
 * Note: This is lossy - the exact original string cannot be perfectly reconstructed
 * after sanitization, but this gives a readable approximation.
 * 
 * @param runtimeId - The runtime ID (e.g., "ogonoperation_nar_for_Grastarr_operation")
 * @returns Approximate parent value (e.g., "Grastarr operation")
 */
export const getParentValueFromRuntimeId = (runtimeId: string): string => {
  if (runtimeId.includes('_for_')) {
    return runtimeId.split('_for_')[1].replace(/_/g, ' ');
  }
  return '';
};

/**
 * Checks if a field ID represents a dynamic follow-up question.
 * 
 * @param fieldId - The field ID to check
 * @returns True if this is a dynamic follow-up question
 */
export const isDynamicFollowupId = (fieldId: string): boolean => {
  return fieldId.includes('_for_');
};

// ==================== Form Builder Utility Functions ====================
// These functions are used by the Form Builder to generate and validate question IDs

/**
 * Generates a unique question ID from a label, ensuring it doesn't conflict
 * with existing questions in the form template.
 * 
 * @param label - The question label
 * @param schema - The form template
 * @param currentId - The current question ID (optional, for editing)
 * @returns A unique question ID
 */
export const generateUniqueQuestionId = (
  label: string,
  schema: any,
  currentId?: string
): string => {
  // Generate base ID from label
  let baseId = sanitizeForFieldId(label);
  
  // If empty after sanitization, use a default
  if (!baseId) {
    baseId = 'question';
  }
  
  // Check if this ID is unique
  let uniqueId = baseId;
  let counter = 1;
  
  while (!isIdUnique(uniqueId, schema, currentId)) {
    uniqueId = `${baseId}_${counter}`;
    counter++;
  }
  
  return uniqueId;
};

/**
 * Checks if a question ID is unique in the form template.
 * 
 * @param id - The question ID to check
 * @param schema - The form template
 * @param currentId - The current question ID (optional, for editing)
 * @returns True if the ID is unique
 */
export const isIdUnique = (
  id: string,
  schema: any,
  currentId?: string
): boolean => {
  // Allow the current ID (when editing)
  if (id === currentId) {
    return true;
  }
  
  // Check all sections and questions
  for (const section of schema.sections || []) {
    for (const question of section.questions || []) {
      if (question.id === id) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Validates a question ID format.
 * 
 * @param id - The question ID to validate
 * @returns Validation result with isValid flag and optional errors array
 */
export const validateQuestionId = (
  id: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!id || id.trim() === '') {
    errors.push('ID cannot be empty');
    return { isValid: false, errors };
  }
  
  // Check for invalid characters
  if (!/^[a-z0-9_]+$/i.test(id)) {
    errors.push('ID can only contain letters, numbers, and underscores');
  }
  
  // Check if starts with a number
  if (/^\d/.test(id)) {
    errors.push('ID cannot start with a number');
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Suggests alternative IDs based on a label.
 * 
 * @param label - The question label
 * @param schema - The form template
 * @param currentId - The current question ID (optional, for editing)
 * @returns Array of suggested IDs
 */
export const suggestAlternativeIds = (
  label: string,
  schema: any,
  currentId?: string
): string[] => {
  const suggestions: string[] = [];
  const baseId = sanitizeForFieldId(label);
  
  if (!baseId) {
    return ['question_1', 'question_2', 'question_3'];
  }
  
  // Generate variations
  const variations = [
    baseId,
    `${baseId}_alt`,
    `${baseId}_new`,
    `${baseId}_v2`,
    `${baseId}_extra`
  ];
  
  // Add unique variations to suggestions
  for (const variation of variations) {
    if (isIdUnique(variation, schema, currentId)) {
      suggestions.push(variation);
    }
    
    // Stop after 5 suggestions
    if (suggestions.length >= 5) {
      break;
    }
  }
  
  // If still need more suggestions, add numbered variations
  let counter = 1;
  while (suggestions.length < 5) {
    const numberedId = `${baseId}_${counter}`;
    if (isIdUnique(numberedId, schema, currentId)) {
      suggestions.push(numberedId);
    }
    counter++;
  }
  
  return suggestions.slice(0, 5);
};
