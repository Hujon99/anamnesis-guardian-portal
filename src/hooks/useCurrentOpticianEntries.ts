
/**
 * This hook provides functionality to filter anamnesis entries assigned to the current user.
 * It leverages the useAnamnesisList hook and filters the results based on the logged-in user.
 * Updated to work with Clerk user IDs instead of database UUIDs.
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
  
  // No longer need to fetch the optician ID as we now use the Clerk ID directly
  const [isLoadingOpticianId, setIsLoadingOpticianId] = useState(false);
  
  // Filter entries assigned to the current optician using the Clerk user ID
  const myEntries = useMemo(() => {
    if (!user) return [];
    
    return entries.filter(entry => entry.optician_id === user.id);
  }, [entries, user]);
  
  // Apply filters to the current user's entries
  const myFilteredEntries = useMemo(() => {
    if (!user) return [];
    
    return filteredEntries.filter(entry => entry.optician_id === user.id);
  }, [filteredEntries, user]);
  
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
      reviewed: myEntries.filter(entry => entry.status === 'reviewed').length,
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
    isOpticianIdLoaded: true, // Always true now since we use Clerk ID directly
    opticianId: user?.id, // Optician ID is now the Clerk user ID
    handleRetry: handleRetryLocal
  };
};
