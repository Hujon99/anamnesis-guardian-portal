/**
 * Hook to fetch and manage the current user's role from Supabase.
 * Provides role information and helper functions for role-based access control.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';

export type UserRole = 'admin' | 'optician' | 'member';

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();
  const { supabase, isReady } = useSupabaseClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!userId || !isReady) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole || null);
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [userId, isReady, supabase]);

  return {
    role,
    isLoading,
    isAdmin: role === 'admin',
    isOptician: role === 'optician',
    isMember: role === 'member',
  };
};
