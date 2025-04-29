
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
      console.log("[AutoSave] Skipping save - missing token, data, or disabled", {
        hasToken: !!token,
        hasData: !!data,
        enabled
      });
      return;
    }
    
    // Skip save if data is empty or only contains empty values
    const hasValues = Object.values(data).some(value => 
      value !== null && value !== undefined && value !== "" && 
      (Array.isArray(value) ? value.length > 0 : true)
    );
    
    if (!hasValues) {
      console.log("[AutoSave] Skipping save - no meaningful data to save");
      return;
    }
    
    try {
      setIsSaving(true);
      
      console.log("[AutoSave] Saving form data for token:", token.substring(0, 6) + "...");
      
      // Format data for storage
      const formattedRawData = JSON.stringify({ 
        answers: data,
        meta: {
          auto_saved: true,
          saved_at: new Date().toISOString(),
          form_template_id: formTemplate?.id || null
        }
      });
      
      // Call the update endpoint to save the data
      const { error } = await supabase
        .from("anamnes_entries")
        .update({ 
          formatted_raw_data: formattedRawData,
          status: "in_progress" 
        })
        .eq("access_token", token);
      
      if (error) {
        console.error("[AutoSave] Error saving data:", error);
        throw new Error(`Failed to save progress: ${error.message}`);
      }
      
      setLastSaved(new Date());
      console.log("[AutoSave] Data saved successfully at", new Date().toLocaleTimeString());
      
    } catch (err) {
      console.error("[AutoSave] Error in saveFormData:", err);
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
    
    console.log(`[AutoSave] Setting up auto-save interval: ${interval}ms`);
    
    const timer = setInterval(() => {
      if (formData) {
        console.log("[AutoSave] Auto-save triggered");
        saveFormData(formData)
          .catch(err => {
            console.error("[AutoSave] Error during auto-save:", err);
            // Show toast only on auto-save errors (not on manual save)
            toast.error("Automatisk sparande misslyckades", {
              description: "Din data sparades inte. Du kan fortsätta fylla i formuläret.",
              duration: 5000,
            });
          });
      }
    }, interval);
    
    return () => {
      console.log("[AutoSave] Clearing auto-save interval");
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
