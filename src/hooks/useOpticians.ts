
/**
 * This hook provides functionality for fetching and managing opticians in the organization.
 * It returns a list of opticians that can be used for assignment to anamnesis entries.
 * Ensures clear distinction between Clerk user IDs and database record IDs.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabaseClient } from './useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

// Database record as it comes from Supabase
interface OpticianDatabaseRecord {
  id: string;               // Supabase database ID (UUID format)
  clerk_user_id: string;    // Clerk user ID (string format "user_...")
  organization_id: string;
  role: string;
}

// Enhanced optician record with Clerk data
export interface Optician extends OpticianDatabaseRecord {
  name?: string;            // Display name from Clerk
  email?: string;           // Email from Clerk
}

// Helper function to safely get optician display name
export function getOpticianDisplayName(optician: Optician | undefined | null): string {
  if (!optician) return 'Ingen optiker';
  
  if (optician.name && optician.name.trim() !== '') {
    return optician.name;
  }
  
  if (optician.email && optician.email.trim() !== '') {
    return optician.email;
  }
  
  return 'Okänd optiker';
}

// Helper function to validate UUID format
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
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
        const enhancedOpticians: Optician[] = await Promise.all(
          data.map(async (databaseRecord: OpticianDatabaseRecord) => {
            try {
              // Try to get user info from organization members
              const members = await organization.getMemberships();
              // Handle memberships response which has .data property for membership list
              const membersList = members?.data || [];
              
              // Now match by clerk_user_id rather than looking up by database id
              const member = membersList.find(m => 
                m.publicUserData?.userId === databaseRecord.clerk_user_id
              );
              
              const enhancedOptician: Optician = {
                ...databaseRecord,
                name: member?.publicUserData?.firstName 
                  ? `${member.publicUserData.firstName} ${member.publicUserData.lastName || ''}`
                  : undefined,
                email: member?.publicUserData?.identifier // Using identifier instead of emailAddress
              };
              
              console.log('Enhanced optician:', enhancedOptician);
              return enhancedOptician;
            } catch (err) {
              console.error('Error fetching Clerk user data:', err);
              // Return the database record with default values for name/email
              return {
                ...databaseRecord,
                name: undefined, 
                email: undefined
              };
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
