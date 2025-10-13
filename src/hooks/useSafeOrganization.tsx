/**
 * Safe wrapper for Clerk's useOrganization hook.
 * This hook can be called safely even when ClerkProvider is not loaded,
 * returning safe default values instead of crashing the application.
 * Used for routes that need to work both with and without authentication (e.g., magic links).
 */

import { useOrganization as useClerkOrganization } from "@clerk/clerk-react";

export const useSafeOrganization = () => {
  try {
    return useClerkOrganization();
  } catch (error) {
    // Clerk not loaded - return safe defaults
    return {
      isLoaded: true,
      organization: null,
      membership: null,
      memberships: null,
    } as ReturnType<typeof useClerkOrganization>;
  }
};
