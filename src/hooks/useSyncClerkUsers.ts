
/**
 * This hook synchronizes Clerk organization members with the Supabase users table,
 * ensuring that all organization members have corresponding entries in the database
 * with the correct roles.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useOrganization, useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const useSyncClerkUsers = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  // Use ref to prevent multiple syncs on mount
  const initialSyncDone = useRef(false);
  
  const { organization } = useOrganization();
  const { userId } = useAuth();
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  
  // Function to check if a user already exists in the database
  const checkUserExists = async (clerkUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking user existence:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error in checkUserExists:', err);
      return null;
    }
  };
  
  // Function to determine the role based on Clerk memberships
  const determineRole = (member: any) => {
    // Check if the member has organization admin role
    const isAdmin = member.role === 'admin';
    
    // Default role is 'optician' for now - this could be expanded with more roles
    return isAdmin ? 'admin' : 'optician';
  };
  
  // Main sync function
  const syncUsers = useCallback(async (showToast = false) => {
    if (!organization || !isReady || !userId) {
      return { success: false, message: 'Organization, Supabase client, or user ID not available' };
    }
    
    try {
      setIsSyncing(true);
      setError(null);
      
      // Get all organization members from Clerk
      const memberships = await organization.getMemberships();
      
      // Check if memberships is valid and has data
      if (!memberships || !memberships.data || memberships.data.length === 0) {
        setIsSyncing(false);
        return { success: false, message: 'No organization members found' };
      }
      
      let createdCount = 0;
      let updatedCount = 0;
      
      // Process each member
      for (const member of memberships.data) {
        if (!member.publicUserData?.userId) continue;
        
        const clerkUserId = member.publicUserData.userId;
        
        // Check if user already exists in Supabase
        const existingUser = await checkUserExists(clerkUserId);
        const role = determineRole(member);
        
        if (!existingUser) {
          // Create new user
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUserId,
              organization_id: organization.id,
              role: role
            });
            
          if (insertError) {
            console.error('Error creating user:', insertError);
            continue;
          }
          
          createdCount++;
        } else if (existingUser.role !== role) {
          // Update user role if it has changed
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: role })
            .eq('clerk_user_id', clerkUserId);
            
          if (updateError) {
            console.error('Error updating user:', updateError);
            continue;
          }
          
          updatedCount++;
        }
      }
      
      // Update sync timestamp
      const now = new Date();
      setLastSyncedAt(now);
      setHasSynced(true);
      
      setIsSyncing(false);
      
      const result = { 
        success: true, 
        message: `Sync completed: ${createdCount} users created, ${updatedCount} users updated`,
        createdCount,
        updatedCount
      };
      
      // Only show toast if there were changes or if explicitly requested
      if (showToast && (createdCount > 0 || updatedCount > 0)) {
        toast({
          title: "Användare synkroniserade",
          description: result.message,
        });
      }
      
      return result;
    } catch (err) {
      const error = err as Error;
      console.error('Error syncing users:', error);
      setError(error);
      setIsSyncing(false);
      
      if (showToast) {
        toast({
          title: "Synkronisering misslyckades",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { success: false, message: error.message };
    }
  }, [organization, userId, isReady, supabase]);
  
  // Run sync once when component mounts - use ref to prevent multiple syncs
  useEffect(() => {
    if (isReady && organization?.id && !initialSyncDone.current) {
      initialSyncDone.current = true;
      syncUsers(false); // Don't show toast on initial sync
    }
  }, [isReady, organization?.id, syncUsers]);
  
  // Sync users and show toast notification only when explicitly called
  const syncUsersWithToast = useCallback(async () => {
    return syncUsers(true); // Show toast when manually triggered
  }, [syncUsers]);
  
  return {
    isSyncing,
    lastSyncedAt,
    hasSynced,
    error,
    syncUsers,
    syncUsersWithToast
  };
};
