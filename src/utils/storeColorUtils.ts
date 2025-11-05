/**
 * Utility functions for generating consistent colors for stores.
 * Each store gets a unique color based on its name or ID, providing
 * visual distinction between different stores throughout the application.
 */

/**
 * Generates a consistent hue (0-360) based on a string input.
 * Same input always produces the same hue value.
 */
const stringToHue = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
};

/**
 * Generates a unique color for a store based on its name or ID.
 * Returns HSL color values suitable for use in Tailwind classes or inline styles.
 * 
 * @param storeName - The name of the store
 * @param storeId - Optional ID for additional uniqueness
 * @returns Object with background and text color classes
 */
export const getStoreColor = (storeName: string, storeId?: string) => {
  const seed = storeId || storeName;
  const hue = stringToHue(seed);
  
  // Use consistent saturation and lightness for harmonious colors
  // Light mode: higher lightness for backgrounds
  const bgHsl = `${hue} 70% 92%`;
  const textHsl = `${hue} 85% 35%`;
  const borderHsl = `${hue} 60% 70%`;
  
  return {
    backgroundColor: `hsl(${bgHsl})`,
    color: `hsl(${textHsl})`,
    borderColor: `hsl(${borderHsl})`,
    hue,
  };
};

/**
 * Gets a vibrant accent color variant for the store.
 * Useful for hover states and emphasis.
 */
export const getStoreAccentColor = (storeName: string, storeId?: string) => {
  const seed = storeId || storeName;
  const hue = stringToHue(seed);
  
  const accentHsl = `${hue} 75% 88%`;
  
  return {
    backgroundColor: `hsl(${accentHsl})`,
  };
};
