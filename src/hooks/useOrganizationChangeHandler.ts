/**
 * This hook handles organization changes in the application, ensuring proper
 * synchronization and state management when users switch between organizations.
 * It provides a centralized way to detect organization changes and trigger
 * necessary cleanup and re-initialization operations.
 */

import { useEffect, useRef } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { useUserSyncStore } from './useUserSyncStore';

interface OrganizationChangeHandlerOptions {
  onOrganizationChange?: (newOrgId: string, prevOrgId: string | null) => void;
  onOrganizationReady?: (orgId: string) => void;
}

export const useOrganizationChangeHandler = (options?: OrganizationChangeHandlerOptions) => {
  const { organization, isLoaded } = useOrganization();
  const prevOrgIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const { resetState } = useUserSyncStore();

  useEffect(() => {
    if (!isLoaded) return;

    const currentOrgId = organization?.id || null;
    const prevOrgId = prevOrgIdRef.current;

    // Initial load - no organization change yet
    if (!hasInitializedRef.current && currentOrgId) {
      console.log(`[OrgChangeHandler] Initial organization: ${currentOrgId}`);
      hasInitializedRef.current = true;
      prevOrgIdRef.current = currentOrgId;
      options?.onOrganizationReady?.(currentOrgId);
      return;
    }

    // Organization changed
    if (currentOrgId && prevOrgId && currentOrgId !== prevOrgId) {
      console.log(`[OrgChangeHandler] Organization changed: ${prevOrgId} -> ${currentOrgId}`);
      
      // Reset sync state for clean slate
      // Note: We don't reset ALL state, just the sync tracking
      // This allows us to maintain history but force re-sync
      
      // Call the change handler
      options?.onOrganizationChange?.(currentOrgId, prevOrgId);
      
      prevOrgIdRef.current = currentOrgId;
    } else if (currentOrgId && !prevOrgId) {
      // User just logged in or organization just loaded
      console.log(`[OrgChangeHandler] Organization loaded: ${currentOrgId}`);
      prevOrgIdRef.current = currentOrgId;
      options?.onOrganizationReady?.(currentOrgId);
    }
  }, [organization?.id, isLoaded, options?.onOrganizationChange, options?.onOrganizationReady]);

  return {
    currentOrganizationId: organization?.id || null,
    previousOrganizationId: prevOrgIdRef.current,
    isLoaded
  };
};
