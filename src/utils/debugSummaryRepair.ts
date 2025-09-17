/**
 * Debug utility for testing AI summary generation and repair functions.
 * This helps verify that the generate-summary function fix works correctly.
 */

import { supabase } from "@/integrations/supabase/client";

export const debugSummaryRepair = {
  /**
   * Test the generate-summary function with a specific entry ID
   */
  async testGenerateSummary(entryId: string) {
    console.log(`[Debug] Testing generate-summary with entry: ${entryId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { entryId }
      });
      
      if (error) {
        console.error('[Debug] generate-summary error:', error);
        return { success: false, error };
      }
      
      console.log('[Debug] generate-summary success:', data);
      return { success: true, data };
    } catch (err) {
      console.error('[Debug] generate-summary exception:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Run the repair-missing-summaries function
   */
  async testRepairFunction() {
    console.log('[Debug] Testing repair-missing-summaries function');
    
    try {
      const { data, error } = await supabase.functions.invoke('repair-missing-summaries', {
        body: { debug: true }
      });
      
      if (error) {
        console.error('[Debug] repair-missing-summaries error:', error);
        return { success: false, error };
      }
      
      console.log('[Debug] repair-missing-summaries success:', data);
      return { success: true, data };
    } catch (err) {
      console.error('[Debug] repair-missing-summaries exception:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Check entries that need AI summaries
   */
  async checkEntriesNeedingSummaries() {
    console.log('[Debug] Checking entries needing AI summaries');
    
    try {
      const { data, error } = await supabase
        .from('anamnes_entries')
        .select('id, patient_identifier, ai_summary, status, created_at, examination_type')
        .eq('status', 'ready')
        .or('ai_summary.is.null,ai_summary.eq.')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('[Debug] Query error:', error);
        return { success: false, error };
      }
      
      console.log(`[Debug] Found ${data?.length || 0} entries needing AI summaries:`, data);
      return { success: true, data };
    } catch (err) {
      console.error('[Debug] Query exception:', err);
      return { success: false, error: err };
    }
  }
};

// Make it available globally for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugSummaryRepair = debugSummaryRepair;
}