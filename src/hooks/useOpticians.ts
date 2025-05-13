
/**
 * This hook provides functionality for fetching and managing opticians in the organization.
 * It returns a list of opticians that can be used for assignment to anamnesis entries.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

interface Optician {
  id: string;
  name?: string;
  email?: string;
  clerk_user_id: string;
  role: string;
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
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('role', 'optician');
          
        if (error) throw error;
        
        // Get user data from Clerk for each optician
        const enhancedOpticians = await Promise.all(
          data.map(async (optician) => {
            try {
              // Try to get user info from organization members
              const members = await organization.getMemberships();
              const member = members.find(m => m.publicUserData?.userId === optician.clerk_user_id);
              
              return {
                ...optician,
                name: member?.publicUserData?.firstName 
                  ? `${member.publicUserData.firstName} ${member.publicUserData.lastName || ''}`
                  : undefined,
                email: member?.publicUserData?.emailAddress
              };
            } catch (err) {
              console.error('Error fetching Clerk user data:', err);
              return optician;
            }
          })
        );
        
        return enhancedOpticians as Optician[];
      } catch (err) {
        console.error('Error fetching opticians:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    enabled: !!organization?.id && isReady,
  });
  
  return {
    opticians,
    isLoading,
    error,
    refetch
  };
}
