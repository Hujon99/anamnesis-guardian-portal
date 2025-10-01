
/**
 * This hook synchronizes Clerk organization members with the Supabase users table,
 * ensuring that all organization members have corresponding entries in the database
 * with the correct roles.
 */

import { useState, useCallback } from 'react';
import { useOrganization, useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const useSyncClerkUsers = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const { organization } = useOrganization();
  const { userId } = useAuth();
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  
  // Function to check if a user already exists in the database
  const checkUserExists = async (clerkUserId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, role, email, first_name, last_name, display_name')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking user existence:', error);
      return null;
    }
    
    return data;
  };
  
  // Function to determine the role based on Clerk memberships
  const determineRole = (member: any) => {
    // Map Clerk organization roles to our Supabase roles
    // Clerk roles: 'org:admin', 'org:optician', 'org:member'
    // Our roles: 'admin', 'optician', 'member'
    const clerkRole = member.role;
    
    // Direct mapping from Clerk roles
    switch (clerkRole) {
      case 'org:admin':
      case 'admin':
        return 'admin';
      case 'org:optician':
      case 'optician':
        return 'optician';
      case 'org:member':
      case 'member':
        return 'member';
      default:
        // Default to member role if unknown
        return 'member';
    }
  };
  
  // Main sync function - uses edge function to bypass RLS
  const syncUsers = useCallback(async () => {
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
      
      // Prepare members data for edge function
      const members = memberships.data.map(member => {
        const memberUser = member.publicUserData;
        return {
          clerkUserId: memberUser.userId,
          email: memberUser.identifier || null,
          firstName: memberUser.firstName || null,
          lastName: memberUser.lastName || null,
          displayName: [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ') || null,
          role: determineRole(member),
        };
      }).filter(m => m.clerkUserId); // Filter out any invalid members
      
      // Call edge function to sync users
      const { data, error: functionError } = await supabase.functions.invoke('sync-users', {
        body: {
          organizationId: organization.id,
          members,
        },
      });
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }
      
      // Update sync timestamp
      const now = new Date();
      setLastSyncedAt(now);
      setIsSyncing(false);
      
      return { 
        success: true, 
        message: data.message || 'Sync completed',
        createdCount: data.results?.created || 0,
        updatedCount: data.results?.updated || 0,
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error syncing users:', error);
      setError(error);
      setIsSyncing(false);
      
      return { success: false, message: error.message };
    }
  }, [organization, userId, isReady, supabase]);
  
  // Sync users and show toast notification
  const syncUsersWithToast = useCallback(async () => {
    const result = await syncUsers();
    
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
  
  return {
    isSyncing,
    lastSyncedAt,
    error,
    syncUsers,
    syncUsersWithToast
  };
};
