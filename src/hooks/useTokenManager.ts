
/**
 * This utility hook manages token verification for the Supabase client.
 * It provides functions to verify tokens without creating circular dependencies.
 * The hook accepts a Supabase client instance as a parameter rather than importing it.
 */

import { useCallback, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/integrations/supabase/types";

export const useTokenManager = (supabaseClient?: SupabaseClient<Database>) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Verify token with the backend
  const verifyToken = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      console.log("[useTokenManager/verifyToken]: Verifying token:", token.substring(0, 6) + "...");
      
      // Fetch the entry using the token
      const { data: entry, error } = await supabaseClient
        .from("anamnes_entries")
        .select("*")
        .eq("access_token", token)
        .maybeSingle();
      
      if (error) {
        console.error("[useTokenManager/verifyToken]: Database error:", error);
        setVerificationError(`Database error: ${error.message}`);
        setIsVerifying(false);
        return { valid: false, error: error.message };
      }
      
      if (!entry) {
        console.error("[useTokenManager/verifyToken]: Entry not found");
        setVerificationError("Ogiltig åtkomsttoken eller så har formuläret redan skickats in");
        setIsVerifying(false);
        return { valid: false, error: "Ogiltig åtkomsttoken" };
      }
      
      // Check if the entry has expired
      if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
        console.error("[useTokenManager/verifyToken]: Token expired");
        setVerificationError("Åtkomsttokenet har upphört att gälla");
        setIsVerifying(false);
        return { valid: false, error: "Token expired", expired: true };
      }
      
      console.log("[useTokenManager/verifyToken]: Token verified successfully");
      setIsVerifying(false);
      return { valid: true, entry };
      
    } catch (err: any) {
      console.error("[useTokenManager/verifyToken]: Error:", err);
      setVerificationError(err.message || "Ett fel uppstod vid verifiering av token");
      setIsVerifying(false);
      return { valid: false, error: err.message };
    }
  }, [supabaseClient]);
  
  // Reset verification state
  const resetVerification = useCallback(() => {
    setIsVerifying(false);
    setVerificationError(null);
  }, []);

  return {
    verifyToken,
    isVerifying,
    verificationError,
    resetVerification
  };
};
