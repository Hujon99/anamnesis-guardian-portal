
/**
 * This hook implements auto-save functionality for form data.
 * It periodically saves form data and handles token verification to ensure
 * the user's progress is not lost if they leave the page.
 */

import { useCallback, useEffect, useState, useRef } from "react";
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

const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 2000; // 2 seconds after user stops typing

export const useAutoSave = ({
  token,
  formData,
  enabled = true,
  interval = AUTOSAVE_INTERVAL,
  onSaveError,
  formTemplate
}: UseAutoSaveOptions) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");
  
  // Save function that can be called manually or automatically
  const saveFormData = useCallback(async (data: Record<string, any> | null) => {
    if (!token || !data || !enabled) {
      return;
    }
    
    // Skip if data hasn't changed
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) {
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
      lastSavedDataRef.current = dataString;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error saving form data");
      setError(error);
      if (onSaveError) onSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [token, enabled, onSaveError]);
  
  // Debounced save on form data change
  useEffect(() => {
    if (!enabled || !token || !formData) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      saveFormData(formData).catch(err => {
        toast.error("Automatisk sparande misslyckades", {
          description: "Din data sparades inte. Du kan fortsätta fylla i formuläret.",
          duration: 5000,
        });
      });
    }, DEBOUNCE_DELAY);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, enabled, token, saveFormData]);
  
  return {
    lastSaved,
    isSaving,
    error,
    saveFormData,
    clearError: () => setError(null)
  };
};
