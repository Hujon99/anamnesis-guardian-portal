
/**
 * This hook synchronizes Clerk organization members with the Supabase users table,
 * ensuring that all organization members have corresponding entries in the database
 * with the correct roles.
 */

import { useState, useCallback, useEffect } from 'react';
import { useOrganization, useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const useSyncClerkUsers = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [syncStats, setSyncStats] = useState<{
    createdCount: number;
    updatedCount: number;
    errorCount: number;
  }>({ createdCount: 0, updatedCount: 0, errorCount: 0 });
  
  const { organization } = useOrganization();
  const { userId } = useAuth();
  const { user } = useUser();
  const { supabase, isReady, refreshClient, handleJwtError } = useSupabaseClient();
  
  // Function to check if a user already exists in the database
  const checkUserExists = async (clerkUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();
        
      if (error) {
        // Check if it's a JWT error and handle accordingly
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          await handleJwtError();
          // Retry after refreshing token
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('id, role')
            .eq('clerk_user_id', clerkUserId)
            .maybeSingle();
            
          if (retryError) {
            console.error('Error checking user existence after JWT refresh:', retryError);
            return null;
          }
          
          return retryData;
        }
        
        console.error('Error checking user existence:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Unexpected error in checkUserExists:', err);
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
  
  // Main sync function with improved error handling and retry logic
  const syncUsers = useCallback(async (force = false) => {
    if (!organization || !isReady || !userId) {
      return { 
        success: false, 
        message: 'Organization, Supabase client, or user ID not available',
        stats: { createdCount: 0, updatedCount: 0, errorCount: 0 }
      };
    }
    
    // If already syncing and not forced, prevent duplicate sync
    if (isSyncing && !force) {
      return { 
        success: false, 
        message: 'Sync already in progress',
        stats: syncStats
      };
    }
    
    try {
      setIsSyncing(true);
      setError(null);
      
      // Force refresh the Supabase client to ensure we have a valid token
      if (force) {
        await refreshClient(true);
      }
      
      // Get all organization members from Clerk
      const memberships = await organization.getMemberships();
      
      // Check if memberships is valid and has data
      if (!memberships || !memberships.data || memberships.data.length === 0) {
        setIsSyncing(false);
        return { 
          success: false, 
          message: 'No organization members found',
          stats: { createdCount: 0, updatedCount: 0, errorCount: 0 }
        };
      }
      
      console.log(`Found ${memberships.data.length} organization members to sync`);
      
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      // Process each member
      for (const member of memberships.data) {
        const clerkUserId = member.publicUserData?.userId;
        
        if (!clerkUserId) {
          console.warn('Member missing Clerk user ID, skipping');
          errorCount++;
          continue;
        }
        
        try {
          // Check if user already exists in Supabase
          const existingUser = await checkUserExists(clerkUserId);
          const role = determineRole(member);
          
          console.log(`Processing member ${clerkUserId}, role: ${role}, exists: ${!!existingUser}`);
          
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
              errorCount++;
              continue;
            }
            
            console.log(`Created new user: ${clerkUserId}`);
            createdCount++;
          } else if (existingUser.role !== role) {
            // Update user role if it has changed
            const { error: updateError } = await supabase
              .from('users')
              .update({ role: role })
              .eq('clerk_user_id', clerkUserId);
              
            if (updateError) {
              console.error('Error updating user:', updateError);
              errorCount++;
              continue;
            }
            
            console.log(`Updated user role for ${clerkUserId}: ${existingUser.role} -> ${role}`);
            updatedCount++;
          } else {
            console.log(`User ${clerkUserId} already exists with correct role: ${role}`);
          }
        } catch (memberError) {
          console.error(`Error processing member ${clerkUserId}:`, memberError);
          errorCount++;
        }
      }
      
      // Update sync timestamp and stats
      const now = new Date();
      setLastSyncedAt(now);
      
      const newStats = { createdCount, updatedCount, errorCount };
      setSyncStats(newStats);
      
      const successMessage = `Sync completed: ${createdCount} users created, ${updatedCount} users updated, ${errorCount} errors`;
      console.log(successMessage);
      
      setIsSyncing(false);
      
      return { 
        success: true, 
        message: successMessage,
        stats: newStats
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error syncing users:', error);
      setError(error);
      setIsSyncing(false);
      setSyncStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
      
      return { 
        success: false, 
        message: error.message,
        stats: { ...syncStats, errorCount: syncStats.errorCount + 1 }
      };
    }
  }, [organization, userId, isReady, supabase, isSyncing, syncStats, refreshClient, handleJwtError]);
  
  // Sync users and show toast notification
  const syncUsersWithToast = useCallback(async (force = false) => {
    const result = await syncUsers(force);
    
    if (result.success) {
      toast({
        title: "Användare synkroniserade",
        description: result.message,
      });
    } else {
      toast({
        title: "Synkronisering misslyckades",
        description: result.message,
        variant: "destructive",
      });
    }
    
    return result;
  }, [syncUsers]);
  
  // Run background sync when component mounts and whenever organization changes
  useEffect(() => {
    let isActive = true;
    
    const backgroundSync = async () => {
      if (!isActive || isSyncing) return;
      
      // Only run background sync if there's no recent sync (within the last hour)
      const shouldSync = !lastSyncedAt || (new Date().getTime() - lastSyncedAt.getTime() > 60 * 60 * 1000);
      
      if (shouldSync) {
        console.log("Running background sync for users...");
        await syncUsers(false);
      }
    };
    
    // Run background sync when component mounts if organization and auth are available
    if (organization?.id && userId && isReady) {
      backgroundSync();
    }
    
    return () => {
      isActive = false;
    };
  }, [organization?.id, userId, isReady, isSyncing, lastSyncedAt, syncUsers]);
  
  return {
    isSyncing,
    lastSyncedAt,
    error,
    syncUsers,
    syncUsersWithToast,
    stats: syncStats
  };
};
