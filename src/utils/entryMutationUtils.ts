
/**
 * This file provides utility functions for anamnesis entry mutations.
 * It includes functions for updating entry statuses, notes, and patient information,
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
 * Updates the status of an anamnesis entry, optionally with notes
 */
export const updateEntryStatus = async (
  supabase: SupabaseClient,
  entryId: string,
  status: string,
  notes?: string
) => {
  const updates: Partial<AnamnesesEntry> = { status };
  if (notes !== undefined) updates.internal_notes = notes;
  
  return updateEntry(supabase, entryId, updates);
};

/**
 * Updates the internal notes of an anamnesis entry
 */
export const updateEntryNotes = async (
  supabase: SupabaseClient,
  entryId: string,
  notes: string
) => {
  return updateEntry(supabase, entryId, { internal_notes: notes });
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
