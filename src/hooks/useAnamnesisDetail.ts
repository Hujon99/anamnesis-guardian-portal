
/**
 * This hook provides functionality for managing anamnesis entry details,
 * including editing, updating, and interacting with entry data.
 */

import { useState, useCallback, useEffect } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useEntryMutations } from "./useEntryMutations";

export function useAnamnesisDetail(
  entry: AnamnesesEntry,
  onEntryUpdated: () => void,
  onClose?: () => void
) {
  // Local state for edited data
  const [formattedRawData, setFormattedRawData] = useState(entry.formatted_raw_data || "");
  const [patientIdentifier, setPatientIdentifier] = useState(entry.patient_identifier || "");
  const [isEditing, setIsEditing] = useState(false);
  
  // Update local state when entry changes (e.g., after refresh)
  useEffect(() => {
    setFormattedRawData(entry.formatted_raw_data || "");
    setPatientIdentifier(entry.patient_identifier || "");
  }, [entry.formatted_raw_data, entry.patient_identifier]);
  
  // Get mutations and print functions
  const {
    updateEntryMutation,
    sendLinkMutation,
    assignOpticianMutation,
    assignStoreMutation,
    updateStatus,
    saveFormattedRawData,
    savePatientIdentifier,
    saveAiSummary,
    sendLink,
    assignOptician,
    assignStore
  } = useEntryMutations(entry.id, onEntryUpdated);

  // Derived values
  const isExpired = entry.expires_at && 
    new Date(entry.expires_at) < new Date();
  
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  // Handle operations with debounce
  const handleSaveFormattedRawData = useCallback(async () => {
    if (formattedRawData !== entry.formatted_raw_data) {
      console.log("Saving formatted raw data of length:", formattedRawData.length);
      return saveFormattedRawData(formattedRawData);
    }
    return Promise.resolve();
  }, [formattedRawData, entry.formatted_raw_data, saveFormattedRawData]);

  const handleSavePatientIdentifier = async () => {
    if (patientIdentifier !== entry.patient_identifier) {
      await savePatientIdentifier(patientIdentifier);
    }
    setIsEditing(false);
    return Promise.resolve();
  };

  const handleSendLink = async () => {
    if (patientIdentifier) {
      return sendLink(patientIdentifier);
    }
    return Promise.resolve();
  };

  const handleStatusUpdate = async (newStatus: string) => {
    return updateStatus(newStatus, formattedRawData);
  };

  const handleSaveAiSummary = async (summary: string) => {
    return saveAiSummary(summary);
  };

  const handleAssignOptician = async (opticianId: string | null) => {
    return assignOptician(opticianId);
  };

  const handleAssignStore = async (storeId: string | null) => {
    return assignStore(storeId);
  };

  const copyLinkToClipboard = () => {
    if (entry.access_token) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/patient-form?token=${entry.access_token}`;
      
      console.log("Copying link to clipboard:", url);
      navigator.clipboard.writeText(url)
        .then(() => {
          console.log("Link successfully copied to clipboard");
        })
        .catch(err => {
          console.error("Error copying link to clipboard:", err);
        });
    }
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset to original value when canceling edit
      setPatientIdentifier(entry.patient_identifier || "");
    }
  };

  return {
    // State
    formattedRawData,
    patientIdentifier,
    isEditing,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    assignOpticianMutation,
    assignStoreMutation,
    
    // Actions
    setFormattedRawData,
    setPatientIdentifier,
    toggleEditing,
    handleSaveFormattedRawData,
    handleSavePatientIdentifier,
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    handleAssignOptician,
    handleAssignStore,
    copyLinkToClipboard
  };
}
