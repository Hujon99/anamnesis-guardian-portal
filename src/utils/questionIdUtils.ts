/**
 * Question ID Utilities
 * Provides functions for generating meaningful, readable question IDs
 * from Swedish text labels, ensuring uniqueness within form schemas.
 */

import { FormTemplate, FormSection } from '@/types/anamnesis';

/**
 * Converts Swedish text to a valid identifier
 * Handles Swedish characters (ö→o, ä→a, å→a) and creates URL-safe IDs
 */
export function swedishTextToId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace Swedish characters
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/å/g, 'a')
    // Replace spaces and special characters with underscores
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    // Remove multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it starts with a letter (add prefix if needed)
    .replace(/^([0-9])/, 'q_$1')
    // Fallback if empty
    || 'question';
}

/**
 * Checks if a question ID is unique within the entire form schema
 */
export function isIdUnique(id: string, schema: FormTemplate, excludeQuestionId?: string): boolean {
  for (const section of schema.sections) {
    for (const question of section.questions) {
      if (question.id === id && question.id !== excludeQuestionId) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Generates a unique question ID based on the label
 * If the generated ID conflicts, adds numeric suffixes (_2, _3, etc.)
 */
export function generateUniqueQuestionId(
  label: string, 
  schema: FormTemplate, 
  excludeQuestionId?: string
): string {
  const baseId = swedishTextToId(label);
  
  if (isIdUnique(baseId, schema, excludeQuestionId)) {
    return baseId;
  }
  
  // Try with numeric suffixes
  let counter = 2;
  let uniqueId = `${baseId}_${counter}`;
  
  while (!isIdUnique(uniqueId, schema, excludeQuestionId) && counter < 100) {
    counter++;
    uniqueId = `${baseId}_${counter}`;
  }
  
  return uniqueId;
}

/**
 * Suggests alternative IDs when the current one has conflicts
 */
export function suggestAlternativeIds(
  label: string, 
  schema: FormTemplate, 
  excludeQuestionId?: string,
  maxSuggestions: number = 3
): string[] {
  const baseId = swedishTextToId(label);
  const suggestions: string[] = [];
  
  // Try variations with different transformations
  const variations = [
    baseId,
    `${baseId}_fraga`,
    `${baseId}_q`,
    swedishTextToId(label.split(' ').slice(0, 2).join(' ')), // First two words
    swedishTextToId(label.split(' ')[0]), // First word only
  ];
  
  for (const variation of variations) {
    if (suggestions.length >= maxSuggestions) break;
    
    if (isIdUnique(variation, schema, excludeQuestionId)) {
      suggestions.push(variation);
    } else {
      // Try with numeric suffix
      for (let i = 2; i <= 5; i++) {
        const suffixedId = `${variation}_${i}`;
        if (isIdUnique(suffixedId, schema, excludeQuestionId) && !suggestions.includes(suffixedId)) {
          suggestions.push(suffixedId);
          break;
        }
      }
    }
  }
  
  return suggestions.slice(0, maxSuggestions);
}

/**
 * Validates a question ID format
 */
export function validateQuestionId(id: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!id || id.trim().length === 0) {
    errors.push('ID kan inte vara tomt');
  }
  
  if (id.length > 50) {
    errors.push('ID får inte vara längre än 50 tecken');
  }
  
  if (!/^[a-z][a-z0-9_]*$/i.test(id)) {
    errors.push('ID måste börja med en bokstav och får endast innehålla bokstäver, siffror och understreck');
  }
  
  if (id.includes('__')) {
    errors.push('ID får inte innehålla flera understreck i rad');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}