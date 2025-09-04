
/**
 * This hook provides functionality to filter anamnesis entries assigned to the current user.
 * It leverages the useAnamnesisList hook and filters the results based on the logged-in user.
 * Updated to work with database UUIDs from the public.users table.
 */

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAnamnesisList } from './useAnamnesisList';
import { AnamnesesEntry } from '@/types/anamnesis';
import { useSupabaseClient } from './useSupabaseClient';

export const useCurrentOpticianEntries = () => {
  const { user } = useUser();
  const { supabase, isReady, refreshClient } = useSupabaseClient();
  const { entries, filteredEntries, filters, updateFilter, resetFilters, isLoading, error, refetch, isFetching, dataLastUpdated, handleRetry } = useAnamnesisList();
  
  // Fetch the current user's database UUID for filtering
  const [currentUserDbId, setCurrentUserDbId] = useState<string | null>(null);
  const [isLoadingOpticianId, setIsLoadingOpticianId] = useState(false);
  
  // Fetch the database user ID for the current Clerk user
  useEffect(() => {
    const fetchCurrentUserDbId = async () => {
      if (!user || !isReady) return;
      
      setIsLoadingOpticianId(true);
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching current user database ID:', error);
          return;
        }
        
        setCurrentUserDbId(userData.id);
      } catch (error) {
        console.error('Error fetching current user database ID:', error);
      } finally {
        setIsLoadingOpticianId(false);
      }
    };
    
    fetchCurrentUserDbId();
  }, [user, supabase, isReady]);
  
  // Filter entries assigned to the current optician using the database UUID
  const myEntries = useMemo(() => {
    if (!currentUserDbId) return [];
    
    return entries.filter(entry => entry.optician_id === currentUserDbId);
  }, [entries, currentUserDbId]);
  
  // Apply filters to the current user's entries
  const myFilteredEntries = useMemo(() => {
    if (!currentUserDbId) return [];
    
    return filteredEntries.filter(entry => entry.optician_id === currentUserDbId);
  }, [filteredEntries, currentUserDbId]);
  
  // Stats for My Anamneses dashboard
  const stats = useMemo(() => {
    if (!myEntries.length) return {
      total: 0,
      pending: 0,
      ready: 0,
      reviewed: 0,
      sent: 0
    };
    
    return {
      total: myEntries.length,
      pending: myEntries.filter(entry => entry.status === 'pending').length,
      ready: myEntries.filter(entry => entry.status === 'ready').length,
      // Count both "journaled" and legacy "reviewed" entries for backward compatibility
      reviewed: myEntries.filter(entry => 
        entry.status === 'journaled' || entry.status === 'reviewed'
      ).length,
      sent: myEntries.filter(entry => entry.status === 'sent').length
    };
  }, [myEntries]);
  
  // Create a local handleRetry function for error cases
  const handleRetryLocal = async () => {
    await refreshClient(true); // Refresh the Supabase client
    if (handleRetry) {
      await handleRetry(); // Call the handleRetry from the parent hook
    }
    refetch(); // Refetch data
  };
  
  return {
    myEntries,
    myFilteredEntries,
    filters,
    updateFilter,
    resetFilters,
    isLoading: isLoading || isLoadingOpticianId,
    error,
    refetch,
    isFetching,
    dataLastUpdated,
    stats,
    isOpticianIdLoaded: !isLoadingOpticianId && !!currentUserDbId,
    opticianId: currentUserDbId, // Optician ID is now the database UUID
    handleRetry: handleRetryLocal
  };
};
