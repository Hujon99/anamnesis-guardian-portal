/**
 * Safe wrapper for Clerk's useAuth hook.
 * This hook can be called safely even when ClerkProvider is not loaded,
 * returning safe default values instead of crashing the application.
 * Used for routes that need to work both with and without authentication (e.g., magic links).
 */

import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export const useSafeAuth = () => {
  try {
    return useClerkAuth();
  } catch (error) {
    // Clerk not loaded - return safe defaults for unauthenticated state
    return {
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      actor: null,
      has: () => false,
      signOut: async () => {},
      getToken: async () => null,
    } as ReturnType<typeof useClerkAuth>;
  }
};
