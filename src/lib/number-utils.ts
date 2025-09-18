/**
 * Utility functions for locale-aware number parsing and validation.
 * Handles both Swedish comma (,) and English dot (.) decimal separators.
 * Essential for visual acuity measurements where users may enter "0,8" or "0.8".
 */

/**
 * Locale-aware parseFloat that handles both comma and dot as decimal separator
 * @param value - The string value to parse (e.g., "0,8" or "0.8")
 * @returns The parsed number, or NaN if invalid
 */
export function parseLocaleFloat(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (!value || typeof value !== 'string') {
    return NaN;
  }
  
  // Normalize the string: replace comma with dot for parseFloat
  const normalizedValue = value.trim().replace(',', '.');
  
  // Use native parseFloat on the normalized value
  return parseFloat(normalizedValue);
}

/**
 * Validates and formats a visual acuity input value
 * @param value - The input value to validate
 * @returns An object with the parsed number and validation info
 */
export function validateVisualAcuityInput(value: string): {
  isValid: boolean;
  parsedValue: number | null;
  formattedValue: string;
  error?: string;
} {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      parsedValue: null,
      formattedValue: '',
    };
  }
  
  const parsed = parseLocaleFloat(value);
  
  if (isNaN(parsed)) {
    return {
      isValid: false,
      parsedValue: null,
      formattedValue: value,
      error: 'Ogiltigt format. Använd t.ex. "0,8" eller "0.8"'
    };
  }
  
  if (parsed < 0 || parsed > 2.0) {
    return {
      isValid: false,
      parsedValue: parsed,
      formattedValue: value,
      error: 'Värdet måste vara mellan 0 och 2.0'
    };
  }
  
  return {
    isValid: true,
    parsedValue: parsed,
    formattedValue: value,
  };
}

/**
 * Formats a number for display in visual acuity inputs
 * Uses comma as decimal separator (Swedish standard)
 * @param value - The number to format
 * @returns Formatted string with comma as decimal separator
 */
export function formatVisualAcuityValue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  // Format with one decimal place and use comma as separator
  return value.toFixed(1).replace('.', ',');
}

/**
 * Formats a visual acuity value for display, preserving exact precision
 * This function is specifically designed to show exact values as entered by users
 * without any rounding or precision loss that might occur with number formatting
 * @param value - The value to format (number, string, or null/undefined)
 * @returns Formatted string preserving original precision with comma as decimal separator
 */
export function formatVisualAcuityDisplay(value: number | string | null | undefined): string {
  console.log('[formatVisualAcuityDisplay] Input:', { value, type: typeof value });
  
  if (value === null || value === undefined) {
    return 'Ej mätt';
  }
  
  // Handle empty string
  if (value === '' || value === 0) {
    return 'Ej mätt';
  }
  
  // Convert to string to preserve exact precision
  const stringValue = String(value);
  console.log('[formatVisualAcuityDisplay] String value:', stringValue);
  
  // If it's already a string with comma, return as is
  if (stringValue.includes(',')) {
    console.log('[formatVisualAcuityDisplay] Has comma, returning as is:', stringValue);
    return stringValue;
  }
  
  // If it's a string with dot, replace with comma
  if (stringValue.includes('.')) {
    const result = stringValue.replace('.', ',');
    console.log('[formatVisualAcuityDisplay] Has dot, replaced with comma:', result);
    return result;
  }
  
  // Handle JavaScript floating point precision issues
  // Check if this looks like a common precision error
  const numValue = typeof value === 'number' ? value : parseFloat(stringValue);
  if (!isNaN(numValue)) {
    // Round to 2 decimal places to avoid floating point precision issues
    // But only if it's very close to a "nice" number
    const rounded = Math.round(numValue * 100) / 100;
    const diff = Math.abs(numValue - rounded);
    
    console.log('[formatVisualAcuityDisplay] Floating point check:', { numValue, rounded, diff });
    
    // If the difference is very small (floating point error), use the rounded version
    if (diff < 0.001) {
      const result = rounded.toString().replace('.', ',');
      console.log('[formatVisualAcuityDisplay] Used rounded value:', result);
      return result;
    }
  }
  
  // If it's a whole number, return as is
  console.log('[formatVisualAcuityDisplay] Returning string as is:', stringValue);
  return stringValue;
}