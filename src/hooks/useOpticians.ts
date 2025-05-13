
/**
 * This hook provides functionality for fetching and managing opticians in the organization.
 * It returns a list of opticians that can be used for assignment to anamnesis entries.
 */

import { useState, useCallback } from 'react';
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
  const { supabase, isReady, validateTokenBeforeRequest, refreshClient } = useSupabaseClient();
  const [error, setError] = useState<Error | null>(null);
  
  // Function to enhance opticians with user data from Clerk
  const enhanceOpticiansWithUserData = useCallback(async (opticians) => {
    if (!organization || !opticians.length) return opticians;
    
    try {
      // Try to get user info from organization members
      const members = await organization.getMemberships();
      // Handle memberships response which has .data property for membership list
      const membersList = members?.data || [];
      
      console.log(`Found ${membersList.length} org members to match with ${opticians.length} opticians`);
      
      return await Promise.all(
        opticians.map(async (optician) => {
          try {
            const member = membersList.find(m => 
              m.publicUserData?.userId === optician.clerk_user_id
            );
            
            if (member) {
              console.log(`Successfully matched optician ${optician.id} with clerk user ${optician.clerk_user_id}`);
            }
            
            return {
              ...optician,
              name: member?.publicUserData?.firstName 
                ? `${member.publicUserData.firstName} ${member.publicUserData.lastName || ''}`.trim()
                : undefined,
              email: member?.publicUserData?.identifier // Using identifier as email
            };
          } catch (err) {
            console.error(`Error enhancing optician ${optician.id}:`, err);
            return optician;
          }
        })
      );
    } catch (err) {
      console.error('Error fetching Clerk user data:', err);
      return opticians;
    }
  }, [organization]);
  
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
        // Validate token before fetching
        await validateTokenBeforeRequest(true);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('role', 'optician');
          
        if (error) {
          console.error('Supabase error fetching opticians:', error);
          throw error;
        }
        
        console.log(`Found ${data.length} opticians in database`);
        
        // Get user data from Clerk for each optician
        const enhancedOpticians = await enhanceOpticiansWithUserData(data);
        
        return enhancedOpticians as Optician[];
      } catch (err) {
        console.error('Error fetching opticians:', err);
        
        // Check if it's a JWT-related error
        if (err.message?.includes('JWT') || err.message?.includes('token')) {
          // Try refreshing client and retry once
          await refreshClient(true);
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('organization_id', organization.id)
              .eq('role', 'optician');
              
            if (error) throw error;
            
            // Get user data from Clerk for each optician
            const enhancedOpticians = await enhanceOpticiansWithUserData(data);
            return enhancedOpticians as Optician[];
          } catch (retryErr) {
            setError(retryErr instanceof Error ? retryErr : new Error(String(retryErr)));
            return [];
          }
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
          return [];
        }
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
