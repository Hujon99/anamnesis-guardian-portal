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
  const [hasResolved, setHasResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { userId, isLoaded: isAuthLoaded } = useAuth();
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
    }
  }, [organization?.id]);

  // Fetch role from Supabase with retry logic
  const fetchSupabaseRole = useCallback(async (attempt: number = 1): Promise<UserRole | null> => {
    if (!userId || !isReady) {
      return null;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('role')
        .eq('clerk_user_id', userId)
        .maybeSingle();

      if (queryError) {
        throw new Error(`Supabase query error: ${queryError.message}`);
      }

      const fetchedRole = (data?.role as UserRole) || null;
      
      setError(null);
      setRetryCount(0);
      
      return fetchedRole;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`useRobustUserRole: Error fetching role (attempt ${attempt}):`, errorMessage);
      
      // Retry logic
      if (attempt < MAX_RETRIES) {
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
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    
    const role = await fetchSupabaseRole(1);
    setSupabaseRole(role);
    setCachedRole(role);
    setHasResolved(true);
    setIsLoading(false);
  }, [fetchSupabaseRole, setCachedRole]);

  useEffect(() => {
    const loadRole = async () => {
      // Check cache first
      const cachedRole = getCachedRole();
      if (cachedRole !== null) {
        setSupabaseRole(cachedRole);
        setHasResolved(true);
        setIsLoading(false);
        return;
      }

      // If Clerk has finished loading and there's no user, we're done (signed out)
      if (isAuthLoaded && !userId) {
        setHasResolved(true);
        setIsLoading(false);
        return;
      }

      // Wait until both Clerk auth and the Supabase client are ready before
      // resolving the role. Otherwise we would prematurely report
      // `isLoading=false` with `supabaseRole=null`, which causes
      // gating components to flash "Åtkomst nekad" for opticians.
      if (!userId || !isReady) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      const role = await fetchSupabaseRole(1);
      setSupabaseRole(role);
      setCachedRole(role);
      setHasResolved(true);
      setIsLoading(false);
    };

    loadRole();

    // Cleanup
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [userId, isAuthLoaded, isReady, getCachedRole, fetchSupabaseRole, setCachedRole]);

  // Determine final roles
  // Admin: Use Clerk's org role as primary source (fast & reliable)
  // Optician: Use Supabase role (more granular)
  const isAdmin = isClerkAdmin || supabaseRole === 'admin';
  const isOptician = supabaseRole === 'optician';
  const isMember = !isAdmin && !isOptician && supabaseRole === 'member';

  // Final role priority: Clerk admin > Supabase optician > Supabase member
  const role: UserRole | null = isAdmin ? 'admin' : supabaseRole;

  // Treat as loading until we have actually resolved the role at least once,
  // so consumers don't make access decisions on stale defaults.
  const effectiveLoading = isLoading || (!hasResolved && !isClerkAdmin);

  return {
    role,
    isLoading: effectiveLoading,
    isAdmin,
    isOptician,
    isMember,
    error,
    retryCount,
    retry,
    canRetry: retryCount > 0 && retryCount < MAX_RETRIES,
  };
};
