
/**
 * This utility module provides token verification functions without dependencies on React hooks.
 * It handles common token operations like validation, formatting, and verification,
 * serving as a central place for all token-related functionality.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { AnamnesesEntry } from "@/types/anamnesis";
import { Database } from "@/integrations/supabase/types";

/**
 * Validates a token string format
 * @param token The token to validate
 * @returns boolean indicating if the token format is valid
 */
export const validateTokenFormat = (token: string | null): boolean => {
  if (!token) return false;
  return typeof token === 'string' && token.length > 0;
};

/**
 * Verify token with the backend
 * @param supabaseClient Supabase client instance
 * @param token Token string to verify
 * @returns Object containing verification result
 */
export const verifyToken = async (
  supabaseClient: SupabaseClient<Database>,
  token: string
): Promise<{
  valid: boolean;
  error?: string;
  entry?: AnamnesesEntry;
  expired?: boolean;
}> => {
  try {
    console.log("[tokenUtils/verifyToken]: Verifying token:", token.substring(0, 6) + "...");
    
    // Fetch the entry using the token
    const { data: entry, error } = await supabaseClient
      .from("anamnes_entries")
      .select("*")
      .eq("access_token", token)
      .maybeSingle();
    
    if (error) {
      console.error("[tokenUtils/verifyToken]: Database error:", error);
      return { valid: false, error: error.message };
    }
    
    if (!entry) {
      console.error("[tokenUtils/verifyToken]: Entry not found");
      return { valid: false, error: "Ogiltig åtkomsttoken" };
    }
    
    // Check if the entry has expired
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      console.error("[tokenUtils/verifyToken]: Token expired");
      return { valid: false, error: "Åtkomsttokenet har upphört att gälla", expired: true };
    }
    
    console.log("[tokenUtils/verifyToken]: Token verified successfully");
    return { valid: true, entry };
    
  } catch (err: any) {
    console.error("[tokenUtils/verifyToken]: Error:", err);
    return { valid: false, error: err.message || "Ett fel uppstod vid verifiering av token" };
  }
};
