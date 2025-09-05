/**
 * Utility functions for displaying user information in the UI.
 * Provides functions to resolve user IDs to display names and handle legacy data.
 */

import { useOpticians } from '@/hooks/useOpticians';

/**
 * Checks if a string looks like a Clerk user ID
 */
export const isUserIdFormat = (str: string): boolean => {
  return str?.startsWith('user_') && str.length > 20;
};

/**
 * Hook to get a function that resolves user IDs to display names
 */
export const useUserResolver = () => {
  const { opticians } = useOpticians();

  const resolveUserDisplay = (verifiedBy: string | null | undefined): string => {
    if (!verifiedBy) return 'Unknown';
    
    // If it doesn't look like a user ID, return as-is (it's probably already a name)
    if (!isUserIdFormat(verifiedBy)) {
      return verifiedBy;
    }
    
    // Try to find the user in our opticians list
    const optician = opticians.find(opt => opt.clerk_user_id === verifiedBy);
    
    if (optician) {
      const displayName = `${optician.first_name || ''} ${optician.last_name || ''}`.trim();
      return displayName || optician.display_name || optician.email || 'Unknown';
    }
    
    // If we can't resolve it, return a cleaner version
    return 'Unknown User';
  };

  return { resolveUserDisplay };
};