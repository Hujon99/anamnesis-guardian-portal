
/**
 * This hook manages the state and logic for the anamnesis detail view.
 * It centralizes all operations related to viewing and updating an anamnesis entry,
 * including formatted raw data management, patient email updates, and status changes.
 * 
 * The formatted raw data is directly stored in the database and used for AI summarization,
 * removing the need for separate internal notes management.
 */

import { useState, useCallback, useEffect } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useEntryMutations } from "./useEntryMutations";
import { usePrintFunction } from "./usePrintFunction";

export function useAnamnesisDetail(
  entry: AnamnesesEntry,
  onEntryUpdated: () => void,
  onClose?: () => void
) {
  // Local state for edited data
  const [formattedRawData, setFormattedRawData] = useState(entry.formatted_raw_data || "");
  const [patientEmail, setPatientEmail] = useState(entry.patient_email || "");
  const [isEditing, setIsEditing] = useState(false);
  
  // Update local state when entry changes (e.g., after refresh)
  useEffect(() => {
    setFormattedRawData(entry.formatted_raw_data || "");
    setPatientEmail(entry.patient_email || "");
  }, [entry.formatted_raw_data, entry.patient_email]);
  
  // Get mutations and print functions
  const {
    updateEntryMutation,
    sendLinkMutation,
    updateStatus,
    saveFormattedRawData,
    savePatientEmail,
    saveAiSummary,
    sendLink
  } = useEntryMutations(entry.id, onEntryUpdated);
  
  const { showPrintPreview, printForm, exportToPDF } = usePrintFunction();

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

  const handleSavePatientEmail = () => {
    if (patientEmail !== entry.patient_email) {
      savePatientEmail(patientEmail);
    }
    setIsEditing(false);
  };

  const handleSendLink = () => {
    if (patientEmail) {
      sendLink(patientEmail);
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
      const url = `${baseUrl}/anamnes?token=${entry.access_token}`;
      navigator.clipboard.writeText(url);
    }
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset to original value when canceling edit
      setPatientEmail(entry.patient_email || "");
    }
  };

  return {
    // State
    formattedRawData,
    patientEmail,
    isEditing,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    
    // Actions
    setFormattedRawData,
    setPatientEmail,
    toggleEditing,
    handleSaveFormattedRawData,
    handleSavePatientEmail,
    handleSendLink,
    handleStatusUpdate,
    handleSaveAiSummary,
    copyLinkToClipboard,
    
    // Print functions
    showPrintPreview,
    printForm,
    exportToPDF
  };
}
