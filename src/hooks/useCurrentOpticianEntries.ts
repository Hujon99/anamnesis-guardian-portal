
/**
 * This hook provides functionality to filter anamnesis entries assigned to the current user.
 * It leverages the useAnamnesisList hook and filters the results based on the logged-in user.
 */

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAnamnesisList } from './useAnamnesisList';
import { AnamnesesEntry } from '@/types/anamnesis';
import { useSupabaseClient } from './useSupabaseClient';

export const useCurrentOpticianEntries = () => {
  const { user } = useUser();
  const { supabase, isReady } = useSupabaseClient();
  const { entries, filteredEntries, filters, updateFilter, resetFilters, isLoading, error, refetch, isFetching, dataLastUpdated } = useAnamnesisList();
  
  // State for storing the current user's optician ID
  const [opticianId, setOpticianId] = useState<string | null>(null);
  const [isLoadingOpticianId, setIsLoadingOpticianId] = useState(true);

  // Fetch the current user's optician ID from the database
  useEffect(() => {
    const fetchOpticianId = async () => {
      if (!user || !isReady) return;
      
      try {
        setIsLoadingOpticianId(true);
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', user.id)
          .eq('role', 'optician')
          .single();
          
        if (error) {
          console.error('Error fetching optician ID:', error);
          setOpticianId(null);
        } else {
          setOpticianId(data?.id || null);
        }
      } catch (err) {
        console.error('Unexpected error fetching optician ID:', err);
        setOpticianId(null);
      } finally {
        setIsLoadingOpticianId(false);
      }
    };
    
    fetchOpticianId();
  }, [user, isReady, supabase]);
  
  // Filter entries assigned to the current optician
  const myEntries = useMemo(() => {
    if (!opticianId) return [];
    
    return entries.filter(entry => entry.optician_id === opticianId);
  }, [entries, opticianId]);
  
  // Apply filters to the current user's entries
  const myFilteredEntries = useMemo(() => {
    if (!opticianId) return [];
    
    return filteredEntries.filter(entry => entry.optician_id === opticianId);
  }, [filteredEntries, opticianId]);
  
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
    isOpticianIdLoaded: !isLoadingOpticianId && opticianId !== null,
    opticianId
  };
};
