/**
 * Context for checking if the current user belongs to the system admin organization.
 * System admins can manage global settings and templates that apply to all organizations.
 */

import React, { createContext, useContext } from 'react';
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemAdminContextType {
  isSystemAdmin: boolean;
  isLoading: boolean;
  systemOrgId: string | null;
}

const SystemAdminContext = createContext<SystemAdminContextType | undefined>(undefined);

export const SystemAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organization } = useOrganization();

  // Check if the current organization is marked as a system org
  const { data: isSystemOrg, isLoading } = useQuery({
    queryKey: ['is-system-org', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return false;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('is_system_org')
        .eq('id', organization.id)
        .single();
      
      if (error) {
        console.error('Error checking system org status:', error);
        return false;
      }
      
      return data?.is_system_org || false;
    },
    enabled: !!organization?.id,
  });

  return (
    <SystemAdminContext.Provider value={{ 
      isSystemAdmin: isSystemOrg || false, 
      isLoading,
      systemOrgId: isSystemOrg ? organization?.id || null : null
    }}>
      {children}
    </SystemAdminContext.Provider>
  );
};

export const useSystemAdmin = () => {
  const context = useContext(SystemAdminContext);
  
  // Return safe default when not in provider context
  // This allows the hook to be used in components that may render
  // outside the SystemAdminProvider (e.g., FormLayout for patient forms)
  if (context === undefined) {
    return {
      isSystemAdmin: false,
      isLoading: false,
      systemOrgId: null
    };
  }
  
  return context;
};
