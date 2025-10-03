
/**
 * This hook implements auto-save functionality for form data.
 * It periodically saves form data and handles token verification to ensure
 * the user's progress is not lost if they leave the page.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseAutoSaveOptions {
  token: string | null;
  formData: Record<string, any> | null;
  enabled?: boolean;
  interval?: number;
  onSaveError?: (error: Error) => void;
  formTemplate?: any;
}

export const useAutoSave = ({
  token,
  formData,
  enabled = true,
  interval = 20000, // 20 seconds by default
  onSaveError,
  formTemplate
}: UseAutoSaveOptions) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Save function that can be called manually or automatically
  const saveFormData = useCallback(async (data: Record<string, any> | null) => {
    if (!token || !data || !enabled) {
      return;
    }
    
    // Skip save if data is empty or only contains empty values
    const hasValues = Object.values(data).some(value => 
      value !== null && value !== undefined && value !== "" && 
      (Array.isArray(value) ? value.length > 0 : true)
    );
    
    if (!hasValues) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Call the save-draft edge function instead of direct database access
      const { error } = await supabase.functions.invoke('save-draft', {
        body: {
          token,
          formData: data
        }
      });
      
      if (error) {
        throw new Error(`Failed to save progress: ${error.message}`);
      }
      
      setLastSaved(new Date());
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error saving form data");
      setError(error);
      if (onSaveError) onSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [token, enabled, formTemplate, onSaveError]);
  
  // Set up interval for auto-saving
  useEffect(() => {
    if (!enabled || !token) return;
    
    const timer = setInterval(() => {
      if (formData) {
        saveFormData(formData)
          .catch(err => {
            // Show toast only on auto-save errors (not on manual save)
            toast.error("Automatisk sparande misslyckades", {
              description: "Din data sparades inte. Du kan fortsätta fylla i formuläret.",
              duration: 5000,
            });
          });
      }
    }, interval);
    
    return () => {
      clearInterval(timer);
    };
  }, [token, formData, interval, enabled, saveFormData]);
  
  return {
    lastSaved,
    isSaving,
    error,
    saveFormData,
    clearError: () => setError(null)
  };
};
