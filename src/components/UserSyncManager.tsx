
/**
 * This component handles automatic synchronization of Clerk users to Supabase.
 * It ensures that when a user logs in or switches organizations, their data is
 * correctly synchronized with the Supabase database, which is essential for
 * features like direct form creation and user assignment to work properly.
 */

import { useEffect, useState } from "react";
import { useUser, useOrganization, useAuth } from "@clerk/clerk-react";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { useEnsureUserRecord } from "@/hooks/useEnsureUserRecord";
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
  
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Effect to handle organization switching or initial login
  useEffect(() => {
    const handleSync = async () => {
      // Skip if not fully loaded or no user or organization
      if (!userLoaded || !orgLoaded || !authLoaded || !user || !organization?.id || !userId) {
        return;
      }

      // Check if we've already synced this organization for this user session
      const syncStatus = getSyncStatus(organization.id);
      if (syncStatus === 'synced') {
        console.log(`[UserSyncManager] Organization ${organization.id} already synced`);
        return;
      }

      // If already syncing, skip
      if (syncStatus === 'syncing') {
        console.log(`[UserSyncManager] Organization ${organization.id} sync already in progress`);
        return;
      }

      // Circuit breaker: if we've failed too many times, don't retry immediately
      if (syncStatus === 'error' && retryCount >= MAX_RETRIES) {
        console.log(`[UserSyncManager] Max retries reached for organization ${organization.id}`);
        return;
      }

      // Wait for organization to be synced first
      if (!isOrgSynced && !isSyncingOrg) {
        console.log(`[UserSyncManager] Waiting for organization to sync first`);
        return;
      }

      console.log(`[UserSyncManager] Starting sync for organization ${organization.id}`);
      setSyncStatus(organization.id, 'syncing');

      try {
        // First ensure the current user record exists
        const ensureResult = await ensureUserRecordWithToast();
        
        // If ensuring current user failed, don't proceed with full sync
        if (!ensureResult.success) {
          console.warn(`[UserSyncManager] Failed to ensure current user, skipping full sync`);
          setSyncStatus(organization.id, 'error');
          setRetryCount(prev => prev + 1);
          
          // Retry after delay if under max retries
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
              setSyncStatus(organization.id, 'idle');
            }, RETRY_DELAY);
          }
          return;
        }
        
        // Sync users for this organization
        const result = await syncUsers();

        if (result.success) {
          console.log(`[UserSyncManager] Sync successful:`, result.message);
          setSyncStatus(organization.id, 'synced');
          setLastSynced(organization.id, new Date());
          setRetryCount(0); // Reset retry count on success
          
          // Only show toast for manual syncs or initial load, not on every org switch
          if (!initialSyncComplete) {
            setInitialSyncComplete(true);
          }
        } else {
          console.error(`[UserSyncManager] Sync failed:`, result.message);
          setSyncStatus(organization.id, 'error');
          setRetryCount(prev => prev + 1);
          
          // Only show error toast if it's a real error and we've exhausted retries
          if (!result.message.includes("No organization members found") && retryCount >= MAX_RETRIES - 1) {
            toast({
              title: "Synkroniseringsfel",
              description: "Kunde inte synkronisera användare med databasen efter flera försök.",
              variant: "destructive",
            });
          }
          
          // Retry after delay if under max retries
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
              setSyncStatus(organization.id, 'idle');
            }, RETRY_DELAY);
          }
        }
      } catch (error) {
        console.error(`[UserSyncManager] Error during sync:`, error);
        setSyncStatus(organization.id, 'error');
        setRetryCount(prev => prev + 1);
      }
    };

    handleSync();
  }, [userLoaded, orgLoaded, authLoaded, organization?.id, userId, retryCount]);

  // This component doesn't render anything visible
  return null;
}
