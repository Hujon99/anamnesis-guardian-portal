
/**
 * This hook provides functionality to filter anamnesis entries assigned to the current user.
 * It leverages the useAnamnesisList hook and filters the results based on the logged-in user.
 * Uses Clerk user IDs for filtering as optician_id references users.clerk_user_id.
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
  
  // Calculate today's bookings
  const todayBookings = useMemo(() => {
    if (!myEntries) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return myEntries.filter(entry => {
      if (!entry.booking_date) return false;
      const bookingDate = new Date(entry.booking_date);
      return bookingDate >= today && bookingDate < tomorrow;
    });
  }, [myEntries]);
  
  // Stats for My Anamneses dashboard with examination types
  const stats = useMemo(() => {
    if (!myEntries.length) return {
      total: 0,
      pending: 0,
      ready: 0,
      reviewed: 0,
      sent: 0,
      examinations: {
        synundersokning: 0,
        korkortsundersokning: 0,
        other: 0
      }
    };
    
    const examinations = {
      synundersokning: myEntries.filter(entry => entry.examination_type === 'Synundersökning').length,
      korkortsundersokning: myEntries.filter(entry => entry.examination_type === 'Körkortsundersökning').length,
      other: myEntries.filter(entry => 
        entry.examination_type && 
        entry.examination_type !== 'Synundersökning' && 
        entry.examination_type !== 'Körkortsundersökning'
      ).length,
    };
    
    return {
      total: myEntries.length,
      pending: myEntries.filter(entry => entry.status === 'pending').length,
      ready: myEntries.filter(entry => entry.status === 'ready').length,
      // Count both "journaled" and legacy "reviewed" entries for backward compatibility
      reviewed: myEntries.filter(entry => 
        entry.status === 'journaled' || entry.status === 'reviewed'
      ).length,
      sent: myEntries.filter(entry => entry.status === 'sent').length,
      examinations,
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
    todayBookings,
    filters,
    updateFilter,
    resetFilters,
    isLoading: isLoading,
    error,
    refetch,
    isFetching,
    dataLastUpdated,
    stats,
    isOpticianIdLoaded: !!user,
    opticianId: user?.id, // Optician ID is the Clerk user ID
    handleRetry: handleRetryLocal
  };
};
