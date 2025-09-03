/**
 * This hook fetches the driving license examination status for a specific entry.
 * It returns whether the examination is completed and any related examination data.
 */

import { useState, useEffect } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { Database } from "@/integrations/supabase/types";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface DrivingLicenseStatus {
  isCompleted: boolean;
  examination: DrivingLicenseExamination | null;
  isLoading: boolean;
  error: string | null;
}

export const useDrivingLicenseStatus = (entryId: string): DrivingLicenseStatus => {
  const [status, setStatus] = useState<DrivingLicenseStatus>({
    isCompleted: false,
    examination: null,
    isLoading: true,
    error: null,
  });
  
  const { supabase } = useSupabaseClient();

  useEffect(() => {
    if (!entryId || !supabase) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchExaminationStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));
        
        const { data: examination, error } = await supabase
          .from('driving_license_examinations')
          .select('*')
          .eq('entry_id', entryId)
          .maybeSingle();

        if (error) {
          setStatus(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: error.message 
          }));
          return;
        }

        const isCompleted = examination?.examination_status === 'completed';
        
        setStatus({
          isCompleted,
          examination,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        }));
      }
    };

    fetchExaminationStatus();
  }, [entryId, supabase]);

  return status;
};