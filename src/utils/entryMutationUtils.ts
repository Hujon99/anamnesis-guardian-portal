
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
 * Updates the patient email of an anamnesis entry
 */
export const updateEntryPatientEmail = async (
  supabase: SupabaseClient,
  entryId: string,
  email: string
) => {
  return updateEntry(supabase, entryId, { patient_email: email });
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
 * Sends a link to a patient by updating the entry status and email
 */
export const sendLinkToPatient = async (
  supabase: SupabaseClient,
  entryId: string,
  patientEmail: string
) => {
  if (!patientEmail) {
    throw new Error("E-post är obligatoriskt för att skicka länk");
  }
  
  return updateEntry(supabase, entryId, {
    patient_email: patientEmail,
    status: "sent",
    sent_at: new Date().toISOString()
  });
};
