
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
  
  const { data: opticians, error, isLoading, refetch } = useQuery({
    queryKey: ['opticians', organization?.id],
    queryFn: async () => {
      if (!organization?.id || !isReady) return [];
      
      try {
        // Log organization ID to help with debugging
        console.log('Fetching opticians for organization:', organization.id);
        
        const { data, error } = await supabase
          .from('users')
          .select('id, clerk_user_id, role, email, first_name, last_name, display_name, organization_id')
          .eq('organization_id', organization.id)
          .eq('role', 'optician')
          .order('display_name, first_name, last_name');
          
        if (error) {
          console.error('Supabase error fetching opticians:', error);
          throw error;
        }
        
        console.log('Fetched raw opticians data:', data);
        
        if (!data || data.length === 0) {
          console.log('No opticians found for organization:', organization.id);
          return [];
        }
        
        // Return opticians with database information
        const opticians = data.map(user => ({
          id: user.id,
          clerk_user_id: user.clerk_user_id,
          organization_id: user.organization_id,
          role: user.role,
          email: user.email,
          name: user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name
        }));
        
        console.log('Enhanced opticians:', opticians);
        return opticians;
      } catch (err) {
        console.error('Error fetching opticians:', err);
        return [];
      }
    },
    enabled: !!organization?.id && isReady,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
  
  return {
    opticians: opticians || [],
    isLoading,
    error,
    refetch
  };
}
