/**
 * Safe wrapper for Clerk's useUser hook.
 * This hook can be called safely even when ClerkProvider is not loaded,
 * returning safe default values instead of crashing the application.
 * Used for routes that need to work both with and without authentication (e.g., magic links).
 */

import { useUser as useClerkUser } from "@clerk/clerk-react";

export const useSafeUser = () => {
  try {
    return useClerkUser();
  } catch (error) {
    // Clerk not loaded - return safe defaults
    return {
      isLoaded: true,
      isSignedIn: false,
      user: null,
    } as ReturnType<typeof useClerkUser>;
  }
};
