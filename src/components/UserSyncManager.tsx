
/**
 * This component handles automatic synchronization of Clerk users to Supabase.
 * It ensures that when a user logs in or switches organizations, their data is
 * correctly synchronized with the Supabase database. This is critical for:
 * - Multi-organization support: ensures data is synced when switching orgs
 * - User permissions: ensures roles are up-to-date for each organization
 * - Direct form creation and user assignment features
 */

import { useEffect, useState, useCallback } from "react";
import { useUser, useOrganization, useAuth } from "@clerk/clerk-react";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { useEnsureUserRecord } from "@/hooks/useEnsureUserRecord";
import { useOrganizationChangeHandler } from "@/hooks/useOrganizationChangeHandler";
import { toast } from "@/components/ui/use-toast";
import { useUserSyncStore } from "@/hooks/useUserSyncStore";
import { Loader2 } from "lucide-react";

export function UserSyncManager() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userId, isLoaded: authLoaded } = useAuth();
  const { syncUsers } = useSyncClerkUsers();
  const { isSyncing: isSyncingOrg, isSynced: isOrgSynced } = useSyncOrganization();
  const { ensureUserRecordWithToast } = useEnsureUserRecord();
  
  const { 
    setSyncStatus, 
    getSyncStatus,
    setLastSynced
  } = useUserSyncStore();
  
  // Track which organizations have been synced in this session
  const [syncedOrganizations, setSyncedOrganizations] = useState<Set<string>>(new Set());

  // Handle organization changes explicitly
  const handleOrganizationChange = useCallback(async (newOrgId: string, prevOrgId: string | null) => {
    console.log(`[UserSyncManager] Organization switched from ${prevOrgId} to ${newOrgId}`);
    
    // Force re-sync for the new organization
    setSyncStatus(newOrgId, 'idle');
    
    toast({
      title: "Organisation bytt",
      description: "Synkroniserar data för den nya organisationen...",
    });
  }, [setSyncStatus]);

  const handleOrganizationReady = useCallback((orgId: string) => {
    console.log(`[UserSyncManager] Organization ready: ${orgId}`);
  }, []);

  // Use the organization change handler
  useOrganizationChangeHandler({
    onOrganizationChange: handleOrganizationChange,
    onOrganizationReady: handleOrganizationReady
  });

  // Effect to handle synchronization for current organization
  useEffect(() => {
    const handleSync = async () => {
      // Skip if not fully loaded or no user or organization
      if (!userLoaded || !orgLoaded || !authLoaded || !user || !organization?.id || !userId) {
        return;
      }

      const currentOrgId = organization.id;

      // Check if we've already synced this organization in this session
      const syncStatus = getSyncStatus(currentOrgId);
      if (syncStatus === 'synced') {
        console.log(`[UserSyncManager] Organization ${currentOrgId} already synced`);
        return;
      }

      // If already syncing, skip
      if (syncStatus === 'syncing') {
        console.log(`[UserSyncManager] Organization ${currentOrgId} sync already in progress`);
        return;
      }

      // Wait for organization to be synced first
      if (!isOrgSynced && isSyncingOrg) {
        console.log(`[UserSyncManager] Waiting for organization to sync first`);
        return;
      }

      console.log(`[UserSyncManager] Starting sync for organization ${currentOrgId}`);
      setSyncStatus(currentOrgId, 'syncing');

      try {
        // First ensure the current user record exists
        await ensureUserRecordWithToast();
        
        // Sync users for this organization
        const result = await syncUsers();

        if (result.success) {
          console.log(`[UserSyncManager] Sync successful:`, result.message);
          setSyncStatus(currentOrgId, 'synced');
          setLastSynced(currentOrgId, new Date());
          setSyncedOrganizations(prev => new Set(prev).add(currentOrgId));
        } else {
          console.error(`[UserSyncManager] Sync failed:`, result.message);
          setSyncStatus(currentOrgId, 'error');
          
          // Only show error toast if it's a real error, not just "no members found"
          if (!result.message.includes("No organization members found")) {
            toast({
              title: "Synkroniseringsfel",
              description: "Kunde inte synkronisera användare med databasen. Vissa funktioner kanske inte fungerar korrekt.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error(`[UserSyncManager] Error during sync:`, error);
        setSyncStatus(currentOrgId, 'error');
        toast({
          title: "Synkroniseringsfel",
          description: "Ett oväntat fel uppstod vid synkronisering.",
          variant: "destructive",
        });
      }
    };

    handleSync();
  }, [
    userLoaded, 
    orgLoaded, 
    authLoaded, 
    organization?.id, 
    userId,
    isOrgSynced,
    isSyncingOrg,
    syncUsers,
    ensureUserRecordWithToast,
    setSyncStatus,
    setLastSynced,
    getSyncStatus
  ]);

  // This component doesn't render anything visible
  return null;
}
