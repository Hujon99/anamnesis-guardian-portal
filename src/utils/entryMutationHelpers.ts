
/**
 * This file provides helper functions for anamesis entry mutations with robust error handling.
 * It includes utilities for handling JWT errors, validating IDs, and ensuring reliable operation
 * for store and optician assignment operations.
 */

import { toast } from "@/components/ui/use-toast";
import { SupabaseClient } from "@supabase/supabase-js";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Clerk ID validation regex (starts with "user_" followed by alphanumeric characters)
const CLERK_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

/**
 * Validates ID format based on type
 */
export const validateId = (id: string | null, fieldName: string, isOpticianId = false): boolean => {
  if (id === null) return true; // null is valid for clearing assignments
  
  if (isOpticianId) {
    // For optician IDs, we expect a Clerk user ID format
    if (!CLERK_ID_REGEX.test(id)) {
      console.error(`Invalid Clerk user ID format for ${fieldName}:`, id);
      return false;
    }
  } else {
    // For other IDs (entry ID, store ID), we expect a UUID format
    if (!UUID_REGEX.test(id)) {
      console.error(`Invalid UUID format for ${fieldName}:`, id);
      return false;
    }
  }
  return true;
};

/**
 * Determines if an error is a JWT/authentication error
 */
export const isJwtError = (error: any): boolean => {
  return (
    error?.code === "PGRST301" || 
    error?.message?.includes("JWT") || 
    error?.message?.includes("401") ||
    /PGRST\d+/.test(error?.message || '')
  );
};

/**
 * Handles JWT errors with appropriate messaging
 */
export const handleJwtError = (error: any, refreshFn?: () => Promise<void>): void => {
  console.error("JWT error detected:", error);
  
  toast({
    title: "Sessionsproblem",
    description: "Din session har gått ut. Systemet försöker automatiskt att förnya sessionen.",
    variant: "destructive",
  });
  
  if (refreshFn) {
    refreshFn().catch(e => {
      console.error("Error refreshing token:", e);
    });
  }
};

/**
 * Handles errors in a user-friendly way based on error type
 */
export const handleUserFriendlyError = (error: any, defaultMessage: string): void => {
  if (isJwtError(error)) {
    toast({
      title: "Sessionsproblem",
      description: "Din session har gått ut. Vänligen ladda om sidan.",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Ett fel uppstod",
      description: error instanceof Error ? error.message : defaultMessage,
      variant: "destructive",
    });
  }
};

/**
 * Generic retry wrapper for database operations with JWT error handling
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>, 
  maxRetries = 2,
  refreshClient?: () => Promise<void>
): Promise<T> => {
  let attempts = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempts++;
      
      // If it's not a JWT error or we've exceeded retries, rethrow
      if (!isJwtError(error) || attempts > maxRetries) {
        throw error;
      }
      
      console.log(`JWT error detected, attempt ${attempts}/${maxRetries}`);
      
      // Attempt to refresh client if provided
      if (refreshClient) {
        try {
          await refreshClient();
        } catch (refreshError) {
          console.error("Error refreshing client:", refreshError);
        }
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempts-1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
