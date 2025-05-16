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
  return updateEntry(supabase, entryId, { optician_id: opticianId });
};

/**
 * Associates an entry with a store
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
  
  // Log the request headers for debugging
  try {
    const result = await updateEntry(supabase, entryId, { store_id: storeId });
    console.log(`entryMutationUtils: Store assignment successful, got result:`, result);
    return result;
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
