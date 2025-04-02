
/**
 * Utilities for creating and configuring Supabase clients.
 * These functions handle the creation of authenticated and unauthenticated
 * Supabase clients with the appropriate configuration.
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk";

/**
 * Creates an authenticated Supabase client with the provided JWT token
 * @param token The JWT token to authenticate the client
 * @returns A Supabase client with authentication headers
 */
export const createSupabaseClient = (token?: string) => {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        headers
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

/**
 * Helper function to handle Supabase errors consistently
 * @param error The error object from Supabase
 * @returns A standardized error object
 */
export const handleSupabaseError = (error: any): Error => {
  console.error("Supabase error:", error);
  
  // Extract the most useful error message
  let message = "Ett oväntat fel uppstod";
  
  if (typeof error === 'string') {
    message = error;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.error_description) {
    message = error.error_description;
  }
  
  // Create a standardized error object
  const standardizedError = new Error(message);
  
  // Add the original error as a property
  (standardizedError as any).originalError = error;
  
  return standardizedError;
};
