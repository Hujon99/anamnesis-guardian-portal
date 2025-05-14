
/**
 * This hook provides functionality for fetching and managing opticians in the organization.
 * It returns a list of opticians that can be used for assignment to anamnesis entries.
 * Ensures clear distinction between Clerk user IDs and Supabase database IDs.
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { isValidUUID } from '@/utils/idConversionUtils';

export interface Optician {
  id: string;               // Supabase database ID (UUID format)
  clerk_user_id: string;    // Clerk user ID (string format "user_...")
  name?: string;            // Display name from Clerk
  email?: string;           // Email from Clerk
  role: string;             // Role in the system
}

export function useOpticians() {
  const { organization } = useOrganization();
  const { supabase, isReady, refreshClient, handleJwtError } = useSupabaseClient();
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Fetch opticians function with improved error handling
  const fetchOpticians = useCallback(async () => {
    if (!organization?.id || !isReady) return [];
    
    try {
      // Log organization ID to help with debugging
      console.log('Fetching opticians for organization:', organization.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('role', 'optician');
        
      if (error) {
        console.error('Supabase error fetching opticians:', error);
        
        // Check if it's a JWT authentication error
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          // Try to refresh the token and retry the request
          if (retryCount < 2) {
            console.log('JWT error detected, refreshing token and retrying...');
            await handleJwtError();
            setRetryCount(prev => prev + 1);
            
            // Retry the request after refreshing the token
            const { data: retryData, error: retryError } = await supabase
              .from('users')
              .select('*')
              .eq('organization_id', organization.id)
              .eq('role', 'optician');
              
            if (retryError) {
              console.error('Retry failed after token refresh:', retryError);
              throw retryError;
            }
            
            return retryData || [];
          }
        }
        
        throw error;
      }
      
      console.log('Fetched raw opticians data:', data);
      
      if (!data || data.length === 0) {
        console.log('No opticians found for organization:', organization.id);
        return [];
      }
      
      // Verify that we have valid UUIDs for the optician IDs
      data.forEach(optician => {
        const isValidUuid = isValidUUID(optician.id);
        if (!isValidUuid) {
          console.warn(`Optician with invalid UUID format found: ${optician.id}`);
        }
      });
      
      // Get user data from Clerk for each optician
      const enhancedOpticians: Optician[] = await Promise.all(
        data.map(async (optician) => {
          try {
            // Try to get user info from organization members
            const members = await organization.getMemberships();
            // Handle memberships response which has .data property for membership list
            const membersList = members?.data || [];
            
            const member = membersList.find(m => 
              m.publicUserData?.userId === optician.clerk_user_id
            );
            
            const enhancedOptician: Optician = {
              ...optician,
              id: optician.id, // Ensure we're using the Supabase UUID
              name: member?.publicUserData?.firstName 
                ? `${member.publicUserData.firstName} ${member.publicUserData.lastName || ''}`
                : undefined,
              email: member?.publicUserData?.identifier // Using identifier instead of emailAddress
            };
            
            console.log('Enhanced optician:', {
              id: enhancedOptician.id,
              clerk_user_id: enhancedOptician.clerk_user_id,
              name: enhancedOptician.name,
              email: enhancedOptician.email
            });
            
            return enhancedOptician;
          } catch (err) {
            console.error('Error fetching Clerk user data:', err);
            return optician as Optician;
          }
        })
      );
      
      // Reset retry count after successful fetch
      if (retryCount > 0) {
        setRetryCount(0);
      }
      
      return enhancedOpticians;
    } catch (err) {
      console.error('Error fetching opticians:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, [organization, isReady, supabase, retryCount, handleJwtError]);
  
  // Query to fetch all opticians for the organization
  const {
    data: opticians = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['opticians', organization?.id, retryCount],
    queryFn: fetchOpticians,
    enabled: !!organization?.id && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Retry failed requests up to 2 times
  });
  
  // Handle retry specifically for JWT errors
  const handleRetry = useCallback(async () => {
    try {
      console.log('Manually retrying opticians fetch with token refresh...');
      await refreshClient(true); // Force refresh the client
      await refetch(); // Refetch data
      
      toast({
        title: "Uppdaterad",
        description: "Listan med optiker har uppdaterats.",
      });
    } catch (err) {
      console.error('Error during manual retry:', err);
      
      toast({
        title: "Uppdatering misslyckades",
        description: "Kunde inte uppdatera listan med optiker. Försök igen.",
        variant: "destructive",
      });
    }
  }, [refreshClient, refetch]);
  
  // Provide detailed logging about what's being returned
  console.log('useOpticians hook returning opticians:', opticians.map(o => ({
    id: o.id,
    clerk_user_id: o.clerk_user_id,
    name: o.name,
    validUUID: isValidUUID(o.id)
  })));
  
  return {
    opticians,
    isLoading,
    error,
    refetch,
    handleRetry
  };
}
