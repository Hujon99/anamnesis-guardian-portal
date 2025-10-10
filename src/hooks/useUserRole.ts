/**
 * Hook to fetch and manage the current user's role from Supabase.
 * Provides role information and helper functions for role-based access control.
 * 
 * NOTE: For production use, prefer useRobustUserRole which combines Clerk org roles
 * with Supabase roles and implements retry logic for better reliability.
 * This hook is kept for backward compatibility.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';

export type UserRole = 'admin' | 'optician' | 'member';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { userId } = useAuth();
  const { supabase, isReady } = useSupabaseClient();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserRole = useCallback(async (attempt: number = 1) => {
    if (!userId || !isReady) {
      setIsLoading(false);
      return;
    }

    try {
      console.log(`useUserRole: Fetching role (attempt ${attempt}/${MAX_RETRIES})`);
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Query error: ${error.message}`);
      }

      const fetchedRole = (data?.role as UserRole) || null;
      console.log('useUserRole: Successfully fetched role:', fetchedRole);
      setRole(fetchedRole);
      setRetryCount(0);
      setIsLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`useUserRole: Error (attempt ${attempt}):`, errorMessage);
      
      // Retry logic
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt);
        retryTimeoutRef.current = setTimeout(() => {
          fetchUserRole(attempt + 1);
        }, RETRY_DELAY * attempt);
      } else {
        console.error('useUserRole: Max retries reached');
        setRole(null);
        setRetryCount(MAX_RETRIES);
        setIsLoading(false);
      }
    }
  }, [userId, isReady, supabase]);

  useEffect(() => {
    fetchUserRole(1);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchUserRole]);

  return {
    role,
    isLoading,
    isAdmin: (role === 'admin') as boolean,
    isOptician: (role === 'optician') as boolean,
    isMember: (role === 'member') as boolean,
    retryCount,
  };
};
