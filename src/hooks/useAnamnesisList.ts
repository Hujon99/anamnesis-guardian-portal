
/**
 * This hook manages the data fetching and filtering logic for anamnesis entries.
 * It provides a unified interface for retrieving, filtering, and sorting
 * anamnesis entries with loading states and error handling.
 * It uses Supabase Realtime for live updates when entries change.
 * 
 * IMPORTANT: This hook now automatically filters entries by the active store
 * when a store is selected in the ActiveStoreContext. This eliminates the need
 * for manual store filtering in the UI.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { AnamnesesEntry } from "@/types/anamnesis";
import { subDays } from "date-fns";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { toast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useActiveStore } from "@/contexts/ActiveStoreContext";

export interface AnamnesisFilters {
  searchQuery: string;
  statusFilter: string | null;
  timeFilter: string | null;
  showOnlyUnanswered: boolean;
  showOnlyBookings: boolean;
  sortDescending: boolean;
  idVerificationFilter: string | null;
  examinationTypeFilter: string | null;
}

export const useAnamnesisList = () => {
  const { organization } = useOrganization();
  const { supabase, isReady, refreshClient } = useSupabaseClient();
  const queryClient = useQueryClient();
  const { activeStore } = useActiveStore(); // Get active store for automatic filtering
  
  // Add safe access to AnamnesisContext - prevent errors if used outside context
  let contextValues;
  let contextError = null;
  
  try {
    contextValues = useAnamnesis();
  } catch (error) {
    console.error("useAnamnesisList: Unable to access AnamnesisContext", error);
    contextError = error;
    // Continue with default values
  }
  
  // Use context values if available, otherwise use defaults
  const dataLastUpdated = contextValues?.dataLastUpdated || new Date();
  const forceRefresh = contextValues?.forceRefresh || (() => {
    console.warn("forceRefresh called outside AnamnesisContext");
    refreshClient(true).then(() => {
      queryClient.invalidateQueries({ queryKey: ["anamnes-entries-all"] });
      queryClient.refetchQueries({ queryKey: ["anamnes-entries-all"] });
    });
  });
  
  // State for filters
  const [filters, setFilters] = useState<AnamnesisFilters>({
    searchQuery: "",
    statusFilter: null,
    timeFilter: null,
    showOnlyUnanswered: false,
    showOnlyBookings: false,
    sortDescending: true,
    idVerificationFilter: null,
    examinationTypeFilter: null,
  });

  // Track realtime subscription
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Fetch all entries regardless of status
  const { 
    data: entries = [], 
    isLoading, 
    error, 
    refetch, 
    isFetching
  } = useQuery({
    queryKey: ["anamnes-entries-all", organization?.id, isReady],
    queryFn: async () => {
      if (!organization?.id) return [];
      if (!isReady) {
        console.log("Supabase client not ready yet, delaying fetch");
        return [];
      }

      try {
        console.log(`Fetching all entries with driving license status for org: ${organization.id}`);
        
        // Fetch entries with driving license examination status in a single query
        const { data, error } = await supabase
          .from("anamnes_entries")
          .select(`
            *,
            anamnes_forms(examination_type),
            driving_license_examinations(
              id,
              examination_status,
              passed_examination,
              visual_acuity_both_eyes,
              visual_acuity_right_eye,
              visual_acuity_left_eye,
              visual_acuity_with_correction_both,
              visual_acuity_with_correction_right,
              visual_acuity_with_correction_left,
              uses_glasses,
              uses_contact_lenses,
              correction_type,
              vision_below_limit,
              id_verification_completed,
              id_type,
              verified_at,
              optician_decision,
              optician_decision_date,
              notes,
              optician_notes,
              created_at,
              updated_at
            )
          `)
          .eq("organization_id", organization.id)
          .order("booking_date", { ascending: false, nullsFirst: false })
          .order("sent_at", { ascending: false });

        if (error) {
          console.error("Error fetching anamnes entries:", error);
          
          // Check for JWT expired error and handle automatically
          if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            console.log("[useAnamnesisList] JWT error detected, will be handled by custom fetch");
          }
          
          throw error;
        }

        console.log(`Fetched ${data?.length || 0} entries with driving license data`);
        setInitialLoadComplete(true);
        
        // Process the joined data to flatten examination_type and driving license status
        const processedEntries = data?.map((entry: any) => {
          const { anamnes_forms, driving_license_examinations, ...entryData } = entry;
          
          // Get the latest driving license examination if multiple exist
          const latestExamination = Array.isArray(driving_license_examinations) && driving_license_examinations.length > 0
            ? driving_license_examinations[driving_license_examinations.length - 1]
            : driving_license_examinations;
          
          return {
            ...entryData,
            examination_type: anamnes_forms?.examination_type || null,
            driving_license_status: latestExamination ? {
              isCompleted: latestExamination.examination_status === 'completed',
              examination: latestExamination
            } : {
              isCompleted: false,
              examination: null
            }
          };
        }) || [];
        
        // Cast the data to AnamnesesEntry[] to ensure it matches the expected type
        return processedEntries as AnamnesesEntry[];
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error("Error in query function:", fetchError);
        
        // Don't show toast for JWT errors as they should be handled transparently
        const isJwtError = errorMessage.includes('JWT') || errorMessage.includes('PGRST301');
        if (!isJwtError) {
          toast({
            title: "Fel vid hämtning av anamneser",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        throw fetchError;
      }
    },
    staleTime: 15 * 60 * 1000, // Increased to 15 minutes for better performance
    gcTime: 30 * 60 * 1000, // Increased to 30 minutes
    enabled: !!organization?.id && isReady, // Only enable when Supabase client is ready
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false, // Reduced unnecessary refetches
    refetchOnReconnect: true, 
    refetchOnMount: "always",
  });

  // Handle realtime updates for both anamnesis entries and driving license examinations
  const setupRealtimeSubscription = useCallback(() => {
    if (!organization?.id || !supabase || !isReady) return;
    
    // Clean up previous subscription if exists
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }
    
    console.log("Setting up enhanced realtime subscription for anamnes_entries and driving_license_examinations");
    
    // Create new subscription for both tables
    const channel = supabase
      .channel('anamnesis-and-driving-license-changes')
      // Subscribe to anamnesis entries changes
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for inserts, updates, and deletes
          schema: 'public',
          table: 'anamnes_entries',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log("Anamnesis entry realtime change:", payload);
          
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(
              ["anamnes-entries-all", organization.id],
              (oldData: AnamnesesEntry[] = []) => {
                const newEntry = { 
                  ...(payload.new as AnamnesesEntry),
                  driving_license_status: { isCompleted: false, examination: null }
                };
                // Check if entry already exists to avoid duplicates
                if (!oldData.some(entry => entry.id === newEntry.id)) {
                  return [newEntry, ...oldData];
                }
                return oldData;
              }
            );
            
            toast({
              title: "Ny anamnes",
              description: "En ny anamnes har tagits emot",
            });
          } 
          else if (payload.eventType === 'UPDATE') {
            // Check if the update affects sorting (status or is_redacted changes)
            const oldEntry = queryClient.getQueryData<AnamnesesEntry[]>(
              ["anamnes-entries-all", organization.id]
            )?.find(entry => entry.id === payload.new.id);
            
            const affectsSorting = oldEntry && (
              oldEntry.status !== payload.new.status ||
              oldEntry.is_redacted !== payload.new.is_redacted
            );

            if (affectsSorting) {
              // Invalidate and refetch to ensure proper sorting
              queryClient.invalidateQueries({
                queryKey: ["anamnes-entries-all", organization.id]
              });
            } else {
              // Just update the cached data for non-sorting changes
              queryClient.setQueryData(
                ["anamnes-entries-all", organization.id],
                (oldData: AnamnesesEntry[] = []) => {
                  return oldData.map(entry => 
                    entry.id === payload.new.id 
                      ? { ...entry, ...payload.new as Partial<AnamnesesEntry> } 
                      : entry
                  );
                }
              );
            }
          }
          else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(
              ["anamnes-entries-all", organization.id],
              (oldData: AnamnesesEntry[] = []) => {
                return oldData.filter(entry => entry.id !== payload.old.id);
              }
            );
          }
        }
      )
      // Subscribe to driving license examinations changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driving_license_examinations',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log("Driving license examination realtime change:", payload);
          
          // Update the corresponding anamnesis entry with new driving license status
          queryClient.setQueryData(
            ["anamnes-entries-all", organization.id],
            (oldData: AnamnesesEntry[] = []) => {
              return oldData.map(entry => {
                // Check if this examination belongs to this entry
                const examinationEntryId = payload.eventType === 'DELETE' 
                  ? payload.old.entry_id 
                  : payload.new.entry_id;
                
                if (entry.id === examinationEntryId) {
                  if (payload.eventType === 'DELETE') {
                    // Examination deleted, reset status
                    return {
                      ...entry,
                      driving_license_status: { isCompleted: false, examination: null }
                    };
                  } else {
                    // Examination created or updated
                    const examination = payload.new;
                    const isCompleted = examination.examination_status === 'completed';
                    return {
                      ...entry,
                      driving_license_status: { isCompleted, examination }
                    };
                  }
                }
                return entry;
              });
            }
          );
        }
      )
      .subscribe((status) => {
        console.log("Enhanced realtime subscription status:", status);
        
        if (status === 'SUBSCRIBED') {
          console.log("Successfully subscribed to enhanced realtime updates");
        } else if (status === 'CHANNEL_ERROR') {
          console.error("Error subscribing to enhanced realtime updates");
          // Try to reconnect after a delay if there's an error
          setTimeout(() => {
            setupRealtimeSubscription();
          }, 5000);
        }
      });
    
    setRealtimeChannel(channel);
    
    return () => {
      console.log("Cleaning up enhanced realtime subscription");
      channel.unsubscribe();
    };
  }, [organization?.id, supabase, queryClient, isReady]);

  // Set up realtime subscription when org, supabase client, or isReady changes
  useEffect(() => {
    if (!isReady) return;
    
    const cleanup = setupRealtimeSubscription();
    
    // Initial data fetch when ready
    if (organization?.id && isReady && !initialLoadComplete) {
      console.log("Triggering initial data fetch because client is now ready");
      refetch();
    }
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [organization?.id, supabase, setupRealtimeSubscription, refetch, isReady, initialLoadComplete]);

  // Update a single filter
  const updateFilter = <K extends keyof AnamnesisFilters>(
    key: K, 
    value: AnamnesisFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      searchQuery: "",
      statusFilter: null,
      timeFilter: null,
      showOnlyUnanswered: false,
      showOnlyBookings: false,
      sortDescending: true,
      idVerificationFilter: null,
      examinationTypeFilter: null,
    });
  };

  // Handle retry for errors
  const handleRetry = async () => {
    await refreshClient(true);
    refetch();
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  // Filter and sort the entries based on current filters
  const filteredEntries = entries.filter(entry => {
    // AUTOMATIC STORE FILTERING: Filter by active store if one is selected
    // BUT: also include entries without store_id (null) to show orphaned entries
    if (activeStore && entry.store_id !== activeStore.id && entry.store_id !== null) {
      return false;
    }

    // Filter by search query - now includes patient_identifier, first name, and booking ID
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      
      // Search in multiple fields including the editable patient_identifier
      const matchesPatientIdentifier = entry.patient_identifier?.toLowerCase().includes(searchLower);
      const matchesFirstName = entry.first_name?.toLowerCase().includes(searchLower);
      const matchesBookingId = entry.booking_id?.toLowerCase().includes(searchLower);
      
      // Also search in any existing reference numbers or names
      const matchesCreatedByName = entry.created_by_name?.toLowerCase().includes(searchLower);
      
      console.log(`Searching for "${filters.searchQuery}" in entry ${entry.id}:`, {
        patient_identifier: entry.patient_identifier,
        first_name: entry.first_name,
        booking_id: entry.booking_id,
        created_by_name: entry.created_by_name,
        matchesPatientIdentifier,
        matchesFirstName,
        matchesBookingId,
        matchesCreatedByName
      });
      
      if (!matchesPatientIdentifier && !matchesFirstName && !matchesBookingId && !matchesCreatedByName) {
        return false;
      }
    }
    
    // Filter by status
    if (filters.statusFilter && entry.status !== filters.statusFilter) {
      return false;
    }
    
    // Filter by time
    if (filters.timeFilter) {
      const now = new Date();
      
      if (filters.timeFilter === "today_bookings") {
        // Filter by booking_date for today's bookings
        const bookingDate = entry.booking_date ? new Date(entry.booking_date) : null;
        if (!bookingDate || !isSameDay(bookingDate, now)) {
          return false;
        }
      } else {
        // Filter by sent_at for other time filters
        const sentDate = entry.sent_at ? new Date(entry.sent_at) : null;
        if (!sentDate) return false;
        
        if (filters.timeFilter === "today" && !isSameDay(sentDate, now)) {
          return false;
        } else if (filters.timeFilter === "week") {
          const weekAgo = subDays(now, 7);
          if (sentDate < weekAgo) {
            return false;
          }
        } else if (filters.timeFilter === "month") {
          const monthAgo = subDays(now, 30);
          if (sentDate < monthAgo) {
            return false;
          }
        }
      }
    }
    
    // Filter by answered status
    if (filters.showOnlyUnanswered) {
      if (entry.answers && Object.keys(entry.answers as Record<string, any>).length > 0) {
        return false;
      }
    }

    // Filter by booking status (magic link entries)
    if (filters.showOnlyBookings) {
      if (!entry.is_magic_link && !entry.booking_id) {
        return false;
      }
    }

    // Filter by ID verification status (only for driving license examinations)
    if (filters.idVerificationFilter) {
      const isDrivingLicense = entry.examination_type?.toLowerCase() === 'körkortsundersökning';
      
      if (filters.idVerificationFilter === 'missing') {
        // Show only driving license exams that are missing ID verification
        if (!isDrivingLicense || entry.id_verification_completed) {
          return false;
        }
      } else if (filters.idVerificationFilter === 'verified') {
        // Show only driving license exams with completed ID verification
        if (!isDrivingLicense || !entry.id_verification_completed) {
          return false;
        }
      }
    }

    // Filter by examination type
    if (filters.examinationTypeFilter) {
      const entryType = entry.examination_type?.toLowerCase();
      const filterType = filters.examinationTypeFilter.toLowerCase();
      
      if (entryType !== filterType) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    // 0. Journaled entries go to bottom - highest priority sort rule
    // Include all journaled states: journaled, reviewed, and redacted entries
    const isJournaledA = a.status === 'journaled' || a.status === 'reviewed' || a.is_redacted;
    const isJournaledB = b.status === 'journaled' || b.status === 'reviewed' || b.is_redacted;
    
    if (isJournaledA && !isJournaledB) return 1;  // A goes after B
    if (!isJournaledA && isJournaledB) return -1; // A goes before B
    
    // Primary sort by booking_date with proper categorization
    const bookingDateA = a.booking_date ? new Date(a.booking_date) : null;
    const bookingDateB = b.booking_date ? new Date(b.booking_date) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if entries have today's booking date
    const isBookingTodayA = bookingDateA && isSameDay(bookingDateA, now);
    const isBookingTodayB = bookingDateB && isSameDay(bookingDateB, now);
    
    // Check if entries are future or past bookings
    const isFutureBookingA = bookingDateA && bookingDateA > today && !isBookingTodayA;
    const isFutureBookingB = bookingDateB && bookingDateB > today && !isBookingTodayB;
    const isPastBookingA = bookingDateA && bookingDateA < today;
    const isPastBookingB = bookingDateB && bookingDateB < today;
    
    // 1. Today's bookings come first
    if (isBookingTodayA && !isBookingTodayB) return -1;
    if (!isBookingTodayA && isBookingTodayB) return 1;
    
    // 2. Future bookings come before past bookings and entries without dates
    if (isFutureBookingA && (isPastBookingB || !bookingDateB)) return -1;
    if (isFutureBookingB && (isPastBookingA || !bookingDateA)) return 1;
    
    // 3. Past bookings come before entries without booking dates
    if (isPastBookingA && !bookingDateB) return -1;
    if (isPastBookingB && !bookingDateA) return 1;
    
    // Sort within each category
    if (bookingDateA && bookingDateB) {
      if (isBookingTodayA && isBookingTodayB) {
        // Today's bookings: sort by time (earliest first)
        return bookingDateA.getTime() - bookingDateB.getTime();
      } else if (isFutureBookingA && isFutureBookingB) {
        // Future bookings: sort ascending (closest dates first)
        return bookingDateA.getTime() - bookingDateB.getTime();
      } else if (isPastBookingA && isPastBookingB) {
        // Past bookings: sort descending (most recent first)
        return bookingDateB.getTime() - bookingDateA.getTime();
      }
    }
    
    // Fallback to sent_at date for entries without booking_date
    const dateA = a.sent_at ? new Date(a.sent_at) : new Date(0);
    const dateB = b.sent_at ? new Date(b.sent_at) : new Date(0);
    
    return filters.sortDescending 
      ? dateB.getTime() - dateA.getTime() 
      : dateA.getTime() - dateB.getTime();
  });

  return {
    entries,
    filteredEntries,
    filters,
    updateFilter,
    resetFilters,
    isLoading,
    error: error || contextError, // Include context error if any
    isFetching,
    refetch,
    handleRetry,
    dataLastUpdated,
    isReady,
    contextAvailable: !!contextValues // Add flag to indicate if context is available
  };
};
