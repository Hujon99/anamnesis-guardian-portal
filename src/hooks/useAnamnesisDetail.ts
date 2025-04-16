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
    updateStatus,
    saveFormattedRawData,
    savePatientIdentifier,
    saveAiSummary,
    sendLink
  } = useEntryMutations(entry.id, onEntryUpdated);

  // Derived values
  const isExpired = entry.expires_at && 
    new Date(entry.expires_at) < new Date();
  
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  // Handle operations with debounce
  const handleSaveFormattedRawData = useCallback(() => {
    if (formattedRawData !== entry.formatted_raw_data) {
      console.log("Saving formatted raw data of length:", formattedRawData.length);
      saveFormattedRawData(formattedRawData);
    }
  }, [formattedRawData, entry.formatted_raw_data, saveFormattedRawData]);

  const handleSavePatientIdentifier = () => {
    if (patientIdentifier !== entry.patient_identifier) {
      savePatientIdentifier(patientIdentifier);
    }
    setIsEditing(false);
  };

  const handleSendLink = () => {
    if (patientIdentifier) {
      sendLink(patientIdentifier);
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatus(newStatus, formattedRawData);
  };

  const handleSaveAiSummary = (summary: string) => {
    saveAiSummary(summary);
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
    
    // Actions
    setFormattedRawData,
    setPatientIdentifier,
    toggleEditing,
    handleSaveFormattedRawData,
    handleSavePatientIdentifier,
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    copyLinkToClipboard
  };
}
