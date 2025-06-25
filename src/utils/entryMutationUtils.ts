/**
 * This file provides utility functions for anamnesis entry mutations.
 * It includes functions for updating entry statuses, formatted raw data, notes, patient information,
 * and ensures consistent error handling and payload formatting.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "./supabaseClientUtils";

/**
 * Updates an anamnesis entry with the provided fields
 */
export const updateEntry = async (
  supabase: SupabaseClient,
  entryId: string,
  updates: Partial<AnamnesesEntry>
) => {
  console.log(`Updating entry ${entryId} with:`, updates);
  
  // Validate the entry ID
  if (!entryId) {
    throw new Error("Missing entry ID for update operation");
  }
  
  const { data, error } = await supabase
    .from("anamnes_entries")
    .update(updates)
    .eq("id", entryId)
    .select()
    .single();

  if (error) {
    console.error("Error updating entry:", error);
    throw handleSupabaseError(error);
  }
  return data;
};

/**
 * Updates the status of an anamnesis entry, optionally with formatted raw data
 */
export const updateEntryStatus = async (
  supabase: SupabaseClient,
  entryId: string,
  status: string,
  formattedRawData?: string
) => {
  const updates: Partial<AnamnesesEntry> = { status };
  if (formattedRawData !== undefined) updates.formatted_raw_data = formattedRawData;
  
  return updateEntry(supabase, entryId, updates);
};

/**
 * Updates the formatted raw data of an anamnesis entry
 */
export const updateEntryFormattedRawData = async (
  supabase: SupabaseClient,
  entryId: string,
  formattedRawData: string
) => {
  console.log(`Saving formatted raw data for entry ${entryId}`);
  return updateEntry(supabase, entryId, { formatted_raw_data: formattedRawData });
};

/**
 * Updates the patient identification information of an anamnesis entry
 */
export const updateEntryPatientIdentifier = async (
  supabase: SupabaseClient,
  entryId: string,
  identifier: string
) => {
  return updateEntry(supabase, entryId, { patient_identifier: identifier });
};

/**
 * Updates the AI summary of an anamnesis entry
 */
export const updateEntryAiSummary = async (
  supabase: SupabaseClient,
  entryId: string,
  summary: string
) => {
  return updateEntry(supabase, entryId, { ai_summary: summary });
};

/**
 * Assigns an optician to an anamnesis entry
 * Now accepts a clerk_user_id (string) instead of UUID
 */
export const assignOpticianToEntry = async (
  supabase: SupabaseClient,
  entryId: string,
  opticianId: string | null
) => {
  // Validate entry ID
  if (!entryId) {
    throw new Error("Missing entry ID for optician assignment");
  }
  
  console.log(`entryMutationUtils: Assigning optician ${opticianId || 'null'} to entry ${entryId}`);
  
  try {
    const result = await updateEntry(supabase, entryId, { optician_id: opticianId });
    console.log(`entryMutationUtils: Optician assignment successful, got result:`, result);
    return result;
  } catch (error) {
    console.error(`entryMutationUtils: Optician assignment failed:`, error);
    throw error;
  }
};

/**
 * Associates an entry with a store with enhanced organization validation
 * Enhanced with improved validation and error handling
 */
export const assignStoreToEntry = async (
  supabase: SupabaseClient,
  entryId: string,
  storeId: string | null
) => {
  // Extra validation to ensure we have a proper entry ID
  if (!entryId) {
    throw new Error("Missing entry ID for store assignment");
  }
  
  console.log(`entryMutationUtils: Assigning store ${storeId || 'null'} to entry ${entryId}`);
  
  try {
    // First, get the entry to check its organization
    const { data: entryData, error: entryError } = await supabase
      .from("anamnes_entries")
      .select("organization_id")
      .eq("id", entryId)
      .single();
      
    if (entryError) {
      console.error("Error fetching entry for organization validation:", entryError);
      throw handleSupabaseError(entryError);
    }
    
    if (!entryData) {
      throw new Error("Entry not found");
    }
    
    const entryOrganizationId = entryData.organization_id;
    console.log(`entryMutationUtils: Entry belongs to organization ${entryOrganizationId}`);
    
    // If assigning a store (not clearing), validate that it belongs to the same organization
    if (storeId !== null) {
      // UUID validation - basic check for correct format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(storeId)) {
        throw new Error(`Invalid store ID format: ${storeId}`);
      }
      
      // Verify that the store exists and belongs to the same organization
      const { data: storeData, error: storeCheckError } = await supabase
        .from("stores")
        .select("id, name, organization_id")
        .eq("id", storeId)
        .single();
        
      if (storeCheckError) {
        console.error("Store validation check failed:", storeCheckError);
        if (storeCheckError.code === 'PGRST116') {
          throw new Error(`Store with ID ${storeId} does not exist`);
        }
        throw handleSupabaseError(storeCheckError);
      }
      
      if (!storeData) {
        throw new Error(`Store with ID ${storeId} does not exist`);
      }
      
      // Critical validation: Check if store belongs to the same organization as the entry
      if (storeData.organization_id !== entryOrganizationId) {
        console.error(`Organization mismatch: Entry org ${entryOrganizationId} vs Store org ${storeData.organization_id}`);
        throw new Error(`Cannot assign store from different organization. Entry belongs to organization ${entryOrganizationId}, but store belongs to organization ${storeData.organization_id}`);
      }
      
      console.log(`entryMutationUtils: Store ${storeData.name} validated for organization ${storeData.organization_id}`);
    }
    
    // Make sure storeId is properly handled when it's null
    const updates: Partial<AnamnesesEntry> = { store_id: storeId };
    
    const { data, error } = await supabase
      .from("anamnes_entries")
      .update(updates)
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      console.error("Error assigning store:", error);
      
      // Handle specific foreign key constraint violation
      if (error.code === '23503' && error.message?.includes('fk_anamnes_entries_store')) {
        throw new Error("Cannot assign store: Organization mismatch detected. Store and entry must belong to the same organization.");
      }
      
      throw handleSupabaseError(error);
    }
    
    console.log(`entryMutationUtils: Store assignment successful, got result:`, data);
    return data;
  } catch (error) {
    console.error(`entryMutationUtils: Store assignment failed:`, error);
    throw error;
  }
};

/**
 * Creates a new entry with patient identifier
 */
export const createEntryWithPatientIdentifier = async (
  supabase: SupabaseClient,
  entryId: string,
  patientIdentifier: string
) => {
  if (!patientIdentifier) {
    throw new Error("Patient-identifierare är obligatoriskt");
  }
  
  return updateEntry(supabase, entryId, {
    patient_identifier: patientIdentifier,
    status: "sent",
    sent_at: new Date().toISOString()
  });
};

/**
 * Utility function to validate a UUID
 * Can be used for any UUID validation need
 */
export const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
