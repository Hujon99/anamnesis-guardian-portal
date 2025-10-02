/**
 * Robust hook for user role management combining Clerk organization roles with Supabase roles.
 * Uses Clerk as primary source (fast, reliable) and Supabase for granular roles (optician).
 * Implements retry logic and caching to handle intermittent failures.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';

export type UserRole = 'admin' | 'optician' | 'member';

interface RoleCache {
  role: UserRole | null;
  timestamp: number;
  orgId: string;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useRobustUserRole = () => {
  const [supabaseRole, setSupabaseRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { userId } = useAuth();
  const { organization, membership } = useOrganization();
  const { supabase, isReady } = useSupabaseClient();
  
  const cacheRef = useRef<RoleCache | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clerk org role (primary source for admin status)
  const clerkOrgRole = membership?.role;
  const isClerkAdmin = clerkOrgRole === 'org:admin';

  // Check if cached role is still valid
  const getCachedRole = useCallback((): UserRole | null => {
    if (!cacheRef.current || !organization?.id) return null;
    
    const now = Date.now();
    const isExpired = now - cacheRef.current.timestamp > CACHE_TTL;
    const isSameOrg = cacheRef.current.orgId === organization.id;
    
    if (!isExpired && isSameOrg) {
      console.log('useRobustUserRole: Using cached role', cacheRef.current.role);
      return cacheRef.current.role;
    }
    
    return null;
  }, [organization?.id]);

  // Save role to cache
  const setCachedRole = useCallback((role: UserRole | null) => {
    if (organization?.id) {
      cacheRef.current = {
        role,
        timestamp: Date.now(),
        orgId: organization.id
      };
      console.log('useRobustUserRole: Cached role', role, 'for org', organization.id);
    }
  }, [organization?.id]);

  // Fetch role from Supabase with retry logic
  const fetchSupabaseRole = useCallback(async (attempt: number = 1): Promise<UserRole | null> => {
    if (!userId || !isReady) {
      console.log('useRobustUserRole: Skipping fetch - userId or supabase not ready');
      return null;
    }

    try {
      console.log(`useRobustUserRole: Fetching role from Supabase (attempt ${attempt}/${MAX_RETRIES})`);
      
      const { data, error: queryError } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_user_id', userId)
        .maybeSingle();

      if (queryError) {
        throw new Error(`Supabase query error: ${queryError.message}`);
      }

      const fetchedRole = (data?.role as UserRole) || null;
      console.log('useRobustUserRole: Successfully fetched role:', fetchedRole);
      
      setError(null);
      setRetryCount(0);
      
      return fetchedRole;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`useRobustUserRole: Error fetching role (attempt ${attempt}):`, errorMessage);
      
      // Retry logic
      if (attempt < MAX_RETRIES) {
        console.log(`useRobustUserRole: Retrying in ${RETRY_DELAY}ms...`);
        setRetryCount(attempt);
        
        return new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(async () => {
            const result = await fetchSupabaseRole(attempt + 1);
            resolve(result);
          }, RETRY_DELAY * attempt); // Exponential backoff
        });
      }
      
      setError(errorMessage);
      setRetryCount(MAX_RETRIES);
      return null;
    }
  }, [userId, isReady, supabase]);

  // Manual retry function
  const retry = useCallback(async () => {
    console.log('useRobustUserRole: Manual retry triggered');
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    
    const role = await fetchSupabaseRole(1);
    setSupabaseRole(role);
    setCachedRole(role);
    setIsLoading(false);
  }, [fetchSupabaseRole, setCachedRole]);

  useEffect(() => {
    const loadRole = async () => {
      // Check cache first
      const cachedRole = getCachedRole();
      if (cachedRole !== null) {
        setSupabaseRole(cachedRole);
        setIsLoading(false);
        return;
      }

      if (!userId || !isReady) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const role = await fetchSupabaseRole(1);
      setSupabaseRole(role);
      setCachedRole(role);
      setIsLoading(false);
    };

    loadRole();

    // Cleanup
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [userId, isReady, getCachedRole, fetchSupabaseRole, setCachedRole]);

  // Determine final roles
  // Admin: Use Clerk's org role as primary source (fast & reliable)
  // Optician: Use Supabase role (more granular)
  const isAdmin = isClerkAdmin || supabaseRole === 'admin';
  const isOptician = supabaseRole === 'optician';
  const isMember = !isAdmin && !isOptician && supabaseRole === 'member';

  // Final role priority: Clerk admin > Supabase optician > Supabase member
  const role: UserRole | null = isAdmin ? 'admin' : supabaseRole;

  console.log('useRobustUserRole: Final state', {
    isAdmin,
    isOptician,
    isMember,
    role,
    clerkOrgRole,
    supabaseRole,
    isLoading,
    error,
    retryCount
  });

  return {
    role,
    isLoading,
    isAdmin,
    isOptician,
    isMember,
    error,
    retryCount,
    retry,
    canRetry: retryCount > 0 && retryCount < MAX_RETRIES,
  };
};
