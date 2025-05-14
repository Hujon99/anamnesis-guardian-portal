
/**
 * This utility provides functions for validating and converting between different ID types,
 * particularly between Clerk user IDs and Supabase database UUIDs.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Clerk User ID pattern typically starts with "user_" followed by alphanumeric characters
const CLERK_USER_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

/**
 * Validates if a string is a valid UUID
 * @param id The ID to validate
 * @returns Boolean indicating if the ID is a valid UUID
 */
export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return UUID_REGEX.test(id);
};

/**
 * Checks if an ID appears to be a Clerk user ID
 * @param id The ID to check
 * @returns Boolean indicating if the ID matches the Clerk user ID pattern
 */
export const isClerkUserId = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return CLERK_USER_ID_REGEX.test(id);
};

/**
 * Converts a Clerk user ID to a Supabase database UUID by looking up in the users table
 * @param supabase SupabaseClient instance
 * @param clerkUserId The Clerk user ID to convert
 * @returns The corresponding Supabase UUID, or null if not found
 */
export const clerkUserIdToSupabaseUuid = async (
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<string | null> => {
  try {
    // If already a UUID, return as is
    if (isValidUUID(clerkUserId)) {
      return clerkUserId;
    }
    
    // If not a Clerk ID format, return null
    if (!isClerkUserId(clerkUserId)) {
      console.error(`ID ${clerkUserId} is neither a UUID nor a Clerk user ID`);
      return null;
    }
    
    // Look up the Supabase UUID from the users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();
      
    if (error) {
      console.error(`Error fetching database ID for Clerk ID ${clerkUserId}:`, error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error(`Error converting Clerk user ID to Supabase UUID:`, error);
    return null;
  }
};

/**
 * Finds the Clerk user ID corresponding to a Supabase UUID
 * @param supabase SupabaseClient instance
 * @param supabaseUuid The Supabase UUID to look up
 * @returns The corresponding Clerk user ID, or null if not found
 */
export const supabaseUuidToClerkUserId = async (
  supabase: SupabaseClient,
  supabaseUuid: string
): Promise<string | null> => {
  try {
    // Validate the UUID format
    if (!isValidUUID(supabaseUuid)) {
      console.error(`Invalid UUID format: ${supabaseUuid}`);
      return null;
    }
    
    // Look up the Clerk user ID from the users table
    const { data, error } = await supabase
      .from('users')
      .select('clerk_user_id')
      .eq('id', supabaseUuid)
      .single();
      
    if (error) {
      console.error(`Error fetching Clerk ID for UUID ${supabaseUuid}:`, error);
      return null;
    }
    
    return data?.clerk_user_id || null;
  } catch (error) {
    console.error(`Error converting Supabase UUID to Clerk user ID:`, error);
    return null;
  }
};

/**
 * Ensures that an ID is a valid Supabase UUID, converting from Clerk ID if necessary
 * @param supabase SupabaseClient instance
 * @param id The ID to validate and potentially convert
 * @param fieldName Name of the field for error reporting
 * @returns A valid Supabase UUID or null
 */
export const ensureDatabaseUuid = async (
  supabase: SupabaseClient,
  id: string | null,
  fieldName: string
): Promise<string | null> => {
  if (id === null) return null; // null is acceptable for clearing assignments
  
  if (isValidUUID(id)) {
    return id; // Already a valid UUID
  }
  
  // Try to convert from Clerk ID
  if (isClerkUserId(id)) {
    const uuid = await clerkUserIdToSupabaseUuid(supabase, id);
    if (uuid) {
      console.log(`Successfully converted Clerk ID ${id} to UUID ${uuid} for ${fieldName}`);
      return uuid;
    }
  }
  
  console.error(`Could not convert ${fieldName} value ${id} to a valid UUID`);
  return null;
};
