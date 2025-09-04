/**
 * This hook ensures that the current user has a record in the public.users table
 * with up-to-date information from their Clerk session. It automatically creates
 * or updates the user record when the user signs in or when user data changes.
 */

import { useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const useEnsureUserRecord = () => {
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [lastEnsuredAt, setLastEnsuredAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const { userId, orgId } = useAuth();
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  
  const ensureUserRecord = useCallback(async () => {
    if (!user || !userId || !orgId || !isReady) {
      return { success: false, message: 'User, organization, or Supabase client not available' };
    }
    
    try {
      setIsEnsuring(true);
      setError(null);
      
      // Extract user information from Clerk
      const email = user.primaryEmailAddress?.emailAddress || null;
      const firstName = user.firstName || null;
      const lastName = user.lastName || null;
      const displayName = user.fullName || [firstName, lastName].filter(Boolean).join(' ') || null;
      
      // Try to upsert the user record
      const { data, error: upsertError } = await supabase
        .from('users')
        .upsert({
          clerk_user_id: userId,
          organization_id: orgId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          role: 'optician' // Default role, can be changed by admins later
        }, {
          onConflict: 'organization_id,clerk_user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();
        
      if (upsertError) {
        console.error('Error upserting user record:', upsertError);
        setError(new Error(upsertError.message));
        setIsEnsuring(false);
        return { success: false, message: upsertError.message };
      }
      
      // Update timestamp
      const now = new Date();
      setLastEnsuredAt(now);
      setIsEnsuring(false);
      
      return { 
        success: true, 
        message: 'User record ensured successfully',
        user: data
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error ensuring user record:', error);
      setError(error);
      setIsEnsuring(false);
      
      return { success: false, message: error.message };
    }
  }, [user, userId, orgId, isReady, supabase]);
  
  // Ensure user record and show toast notification
  const ensureUserRecordWithToast = useCallback(async () => {
    const result = await ensureUserRecord();
    
    if (!result.success) {
      console.error('Failed to ensure user record:', result.message);
      // Don't show error toast for user record issues - it's not critical enough to interrupt UX
    }
    
    return result;
  }, [ensureUserRecord]);
  
  return {
    isEnsuring,
    lastEnsuredAt,
    error,
    ensureUserRecord,
    ensureUserRecordWithToast
  };
};