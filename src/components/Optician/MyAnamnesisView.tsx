/**
 * This component provides a personal view of anamnesis entries assigned to the current optician.
 * It displays personal statistics and a filtered list of entries.
 * Updated with improved filter design and layout consistency.
 */

import { useState, useMemo } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { AnamnesisDetailModal } from "./AnamnesisDetailModal";
import { AnamnesisFilters } from "./AnamnesisFilters";
import { ErrorState } from "./EntriesList/ErrorState";
import { LoadingState } from "./EntriesList/LoadingState";
import { SearchInput } from "./EntriesList/SearchInput";
import { EntriesSummary } from "./EntriesList/EntriesSummary";
import { EntriesList } from "./EntriesList/EntriesList";
import { TodayBookingsSection } from "./TodayBookingsSection";
import { ExaminationTypeStatsCards } from "./ExaminationTypeStatsCards";
import { useCurrentOpticianEntries } from "@/hooks/useCurrentOpticianEntries";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Store } from "@/types/anamnesis";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { toast } from "@/components/ui/use-toast";

export function MyAnamnesisView() {
  const {
    myFilteredEntries,
    myEntries,
    todayBookings,
    filters,
    updateFilter,
    resetFilters,
    isLoading,
    error,
    isFetching,
    refetch,
    dataLastUpdated,
    stats,
    isOpticianIdLoaded
  } = useCurrentOpticianEntries();
  
  // State for selected entry
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const isMobile = useIsMobile();
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { refreshClient } = useSupabaseClient();
  
  // Fetch stores for enhancing display
  const { data: stores = [] } = useQuery({
    queryKey: ["stores", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id);
        
      if (error) throw error;
      return data as Store[];
    },
    enabled: !!organization?.id
  });
  
  // Create a map of store IDs to store names for quick lookup
  const storeMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    stores.forEach(store => {
      map[store.id] = store.name;
    });
    return map;
  }, [stores]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered in MyAnamnesisView");
    refetch?.();
  };

  // Add handleRetry function for error state
  const handleRetry = async () => {
    await refreshClient(true);
    refetch?.();
  };

  // Handle entry assignment - Updated to use the useEntryMutations hook
  const handleEntryAssigned = async (entryId: string, opticianId: string | null): Promise<void> => {
    if (!entryId) {
      console.error("Missing entry ID for optician assignment");
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela optiker: Saknar anamnes-ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log(`MyAnamnesisView: Assigning optician ${opticianId || 'null'} to entry ${entryId}`);
      
      // Create an instance of mutations for this specific entry
      const mutations = useEntryMutations(entryId);
      await mutations.assignOptician(opticianId);
      
      // Refresh data after successful assignment
      await refetch?.();
      
    } catch (error) {
      console.error("Error assigning optician:", error);
      // Error is already handled by the mutations hook
    }
  };

  // Handle store assignment - Updated to use the useEntryMutations hook
  const handleStoreAssigned = async (entryId: string, storeId: string | null): Promise<void> => {
    if (!entryId) {
      console.error("Missing entry ID for store assignment");
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela butik: Saknar anamnes-ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log(`MyAnamnesisView: Using useEntryMutations to assign store ${storeId || 'null'} to entry ${entryId}`);
      
      // Create an instance of mutations for this specific entry
      const mutations = useEntryMutations(entryId);
      
      // Use the robust assignStore method from the hook
      await mutations.assignStore(storeId);
      
      // Refresh data after successful assignment
      await refetch?.();
      
    } catch (error) {
      console.error("Error in handleStoreAssigned:", error);
      // Error is already handled by the mutations hook
    }
  };

  // Handle entry updates (including reference number changes)
  const handleEntryUpdated = () => {
    refetch?.();
  };

  const getEntryExpirationInfo = (entry: AnamnesesEntry) => {
    if (!entry.auto_deletion_timestamp) return { isExpired: false, daysUntilExpiration: null };
    
    // Only show deletion messages for entries that will actually be auto-deleted
    const deletionEligibleStatuses = ['journaled', 'ready', 'reviewed'];
    if (!deletionEligibleStatuses.includes(entry.status)) {
      return { isExpired: false, daysUntilExpiration: null };
    }
    
    // For bookings, only show deletion message if booking date has passed
    if (entry.booking_date) {
      const now = new Date();
      const bookingDate = new Date(entry.booking_date);
      if (bookingDate > now) {
        return { isExpired: false, daysUntilExpiration: null };
      }
    }
    
    const now = new Date();
    const expirationDate = new Date(entry.auto_deletion_timestamp);
    const isExpired = expirationDate < now;
    
    if (isExpired) return { isExpired: true, daysUntilExpiration: null };
    
    const diffTime = Math.abs(expirationDate.getTime() - now.getTime());
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { isExpired, daysUntilExpiration };
  };
  
  // Enhance entries with store information
  const enhancedEntries = useMemo(() => {
    return myFilteredEntries.map(entry => {
      // Get store name if available
      const storeName = entry.store_id ? storeMap[entry.store_id] || null : null;
      // Check if this is a booking without a store assigned
      const isBookingWithoutStore = (entry.is_magic_link || entry.booking_id || entry.booking_date) && !entry.store_id;
      
      return {
        ...entry,
        ...getEntryExpirationInfo(entry),
        storeName,
        isBookingWithoutStore
      };
    });
  }, [myFilteredEntries, storeMap]);

  // Enhance today's bookings with store information
  const enhancedTodayBookings = useMemo(() => {
    return todayBookings.map(entry => {
      const storeName = entry.store_id ? storeMap[entry.store_id] || null : null;
      const isBookingWithoutStore = (entry.is_magic_link || entry.booking_id || entry.booking_date) && !entry.store_id;
      
      return {
        ...entry,
        ...getEntryExpirationInfo(entry),
        storeName,
        isBookingWithoutStore
      };
    });
  }, [todayBookings, storeMap]);

  if (!isOpticianIdLoaded) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Du är inte registrerad som optiker</h2>
          <p className="text-muted-foreground">
            Kontakta systemadministratören om du anser att detta är fel.
          </p>
        </div>
      </div>
    );
  }

  if ((isLoading && !myEntries.length)) {
    return <LoadingState />;
  }

  if (error && !isFetching) {
    return <ErrorState errorMessage={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <ExaminationTypeStatsCards stats={stats} />

      {enhancedTodayBookings.length > 0 && (
        <TodayBookingsSection
          todayBookings={enhancedTodayBookings}
          onSelectEntry={setSelectedEntry}
          onEntryDeleted={refetch}
          onEntryAssigned={handleEntryAssigned}
          onStoreAssigned={handleStoreAssigned}
        />
      )}
      
      {/* Search Section */}
      <Card className="p-6 bg-white rounded-2xl shadow-sm border border-muted/30">
        <SearchInput
          searchQuery={filters.searchQuery}
          onSearchChange={(value) => updateFilter("searchQuery", value)}
          onRefresh={handleManualRefresh}
          isRefreshing={isFetching}
        />
      </Card>

      {/* Filters Section */}
      <AnamnesisFilters
        statusFilter={filters.statusFilter}
        onStatusFilterChange={(value) => updateFilter("statusFilter", value)}
        timeFilter={filters.timeFilter}
        onTimeFilterChange={(value) => updateFilter("timeFilter", value)}
        showOnlyUnanswered={filters.showOnlyUnanswered}
        onUnansweredFilterChange={(value) => updateFilter("showOnlyUnanswered", value)}
        sortDescending={filters.sortDescending}
        onSortDirectionChange={(value) => updateFilter("sortDescending", value)}
        showOnlyBookings={filters.showOnlyBookings}
        onBookingFilterChange={(value) => updateFilter("showOnlyBookings", value)}
        onResetFilters={resetFilters}
      />
      
      <div>
        <EntriesSummary
          filteredCount={enhancedEntries.length}
          totalCount={myEntries.length}
          statusFilter={filters.statusFilter}
          isFetching={isFetching}
          lastUpdated={dataLastUpdated}
        />
        
        <EntriesList
          entries={enhancedEntries.filter(entry => !enhancedTodayBookings.some(tb => tb.id === entry.id))}
          onSelectEntry={setSelectedEntry}
          onEntryDeleted={refetch}
          onEntryUpdated={handleEntryUpdated}
          onEntryAssigned={handleEntryAssigned}
          onStoreAssigned={handleStoreAssigned}
        />
      </div>
      
      {selectedEntry && (
        <AnamnesisDetailModal
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onOpenChange={(open) => {
            if (!open) setSelectedEntry(null);
          }}
          onEntryUpdated={() => {
            refetch?.();
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
