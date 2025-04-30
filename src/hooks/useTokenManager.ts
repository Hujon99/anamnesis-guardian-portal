
/**
 * This utility hook manages token verification for the Supabase client.
 * It provides functions to verify tokens without creating circular dependencies.
 * The hook accepts a Supabase client instance as a parameter rather than importing it.
 * It now leverages the standalone tokenUtils module for core verification logic.
 */

import { useCallback, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "@/integrations/supabase/types";
import { verifyToken } from '@/utils/tokenUtils';

export const useTokenManager = (supabaseClient?: SupabaseClient<Database>) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Verify token with the backend
  const verifyTokenWithState = useCallback(async (token: string) => {
    if (!supabaseClient) {
      throw new Error("Supabase client not initialized");
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Use the standalone verifyToken function from tokenUtils
      const result = await verifyToken(supabaseClient, token);
      
      // Update state based on verification result
      if (!result.valid) {
        setVerificationError(result.error || "Unknown verification error");
      }
      
      setIsVerifying(false);
      return result;
      
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
    verifyToken: verifyTokenWithState,
    isVerifying,
    verificationError,
    resetVerification
  };
};
