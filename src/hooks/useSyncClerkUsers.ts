
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
    // Check if the member has organization admin role
    const isAdmin = member.role === 'admin';
    
    // Default role is 'optician' for now - this could be expanded with more roles
    return isAdmin ? 'admin' : 'optician';
  };
  
  // Main sync function
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
      
      let createdCount = 0;
      let updatedCount = 0;
      
      // Process each member
      for (const member of memberships.data) {
        const clerkUserId = member.publicUserData.userId;
        
        if (!clerkUserId) continue;
        
        // Check if user already exists in Supabase
        const existingUser = await checkUserExists(clerkUserId);
        const role = determineRole(member);
        
        if (!existingUser) {
          // Create new user with email and name information
          const memberUser = member.publicUserData;
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUserId,
              organization_id: organization.id,
              role: role,
              email: memberUser.identifier || null, // Clerk identifier is usually email
              first_name: memberUser.firstName || null,
              last_name: memberUser.lastName || null,
              display_name: [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ') || null
            });
            
          if (insertError) {
            console.error('Error creating user:', insertError);
            continue;
          }
          
          createdCount++;
        } else {
          // Update user information if it has changed
          const memberUser = member.publicUserData;
          const newEmail = memberUser.identifier || null;
          const newFirstName = memberUser.firstName || null;
          const newLastName = memberUser.lastName || null;
          const newDisplayName = [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ') || null;
          
          const needsUpdate = (
            existingUser.role !== role ||
            existingUser.email !== newEmail ||
            existingUser.first_name !== newFirstName ||
            existingUser.last_name !== newLastName ||
            existingUser.display_name !== newDisplayName
          );
          
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                role: role,
                email: newEmail,
                first_name: newFirstName,
                last_name: newLastName,
                display_name: newDisplayName
              })
              .eq('clerk_user_id', clerkUserId);
              
            if (updateError) {
              console.error('Error updating user:', updateError);
              continue;
            }
            
            updatedCount++;
          }
        }
      }
      
      // Update sync timestamp
      const now = new Date();
      setLastSyncedAt(now);
      
      setIsSyncing(false);
      
      return { 
        success: true, 
        message: `Sync completed: ${createdCount} users created, ${updatedCount} users updated`,
        createdCount,
        updatedCount
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
