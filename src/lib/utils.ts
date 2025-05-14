
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AnamnesesEntry } from "@/types/anamnesis"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the appropriate display name for a patient based on available information
 * Prioritizes first_name and falls back to patient_identifier or combination of both
 */
export function getPatientDisplayName(entry: AnamnesesEntry): string {
  // First priority: first_name if available
  if (entry.first_name && 
      entry.first_name.length > 0 && 
      entry.first_name !== "undefined" && 
      entry.first_name !== "null") {
    return entry.first_name;
  }
  
  // Second priority: patient_identifier if it looks like a name
  if (entry.patient_identifier && entry.patient_identifier.length > 1 && 
      !entry.patient_identifier.match(/^[0-9]+$/) && // Not just numbers
      entry.patient_identifier !== "undefined" && 
      entry.patient_identifier !== "null") {
    return entry.patient_identifier;
  }
  
  // Third priority: Use both if available and different
  if (entry.first_name && entry.patient_identifier && 
      entry.first_name !== entry.patient_identifier &&
      entry.first_name.length > 0 &&
      entry.first_name !== "undefined" && 
      entry.first_name !== "null") {
    return `${entry.first_name} (${entry.patient_identifier})`;
  }
  
  // Fallback
  return "Anonym patient";
}
