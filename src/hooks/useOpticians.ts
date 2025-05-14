
/**
 * This hook provides functionality for fetching and managing opticians in the organization.
 * It returns a list of opticians that can be used for assignment to anamnesis entries.
 * Ensures clear distinction between Clerk user IDs and Supabase database IDs.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

interface Optician {
  id: string;               // Supabase database ID (UUID format)
  clerk_user_id: string;    // Clerk user ID (string format "user_...")
  name?: string;            // Display name from Clerk
  email?: string;           // Email from Clerk
  role: string;             // Role in the system
}

export function useOpticians() {
  const { organization } = useOrganization();
  const { supabase, isReady } = useSupabaseClient();
  const [error, setError] = useState<Error | null>(null);
  
  // Query to fetch all opticians for the organization
  const {
    data: opticians = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['opticians', organization?.id],
    queryFn: async () => {
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
          throw error;
        }
        
        console.log('Fetched raw opticians data:', data);
        
        if (!data || data.length === 0) {
          console.log('No opticians found for organization:', organization.id);
          return [];
        }
        
        // Get user data from Clerk for each optician
        const enhancedOpticians = await Promise.all(
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
              
              console.log('Enhanced optician:', enhancedOptician);
              return enhancedOptician;
            } catch (err) {
              console.error('Error fetching Clerk user data:', err);
              return optician as Optician;
            }
          })
        );
        
        return enhancedOpticians;
      } catch (err) {
        console.error('Error fetching opticians:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    enabled: !!organization?.id && isReady,
  });
  
  // Provide detailed logging about what's being returned
  console.log('useOpticians hook returning opticians:', opticians);
  
  return {
    opticians,
    isLoading,
    error,
    refetch
  };
}
