
/**
 * This hook manages the state and logic for the anamnesis detail view.
 * It centralizes all operations related to viewing and updating an anamnesis entry,
 * including notes management, patient email updates, and status changes.
 */

import { useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useEntryMutations } from "./useEntryMutations";
import { usePrintFunction } from "./usePrintFunction";

export function useAnamnesisDetail(
  entry: AnamnesesEntry,
  onEntryUpdated: () => void,
  onClose?: () => void
) {
  // Local state
  const [notes, setNotes] = useState(entry.internal_notes || "");
  const [patientEmail, setPatientEmail] = useState(entry.patient_email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  
  // Get mutations and print functions
  const {
    updateEntryMutation,
    sendLinkMutation,
    updateStatus,
    saveNotes,
    savePatientEmail,
    sendLink
  } = useEntryMutations(entry.id, onEntryUpdated);
  
  const { showPrintPreview, printForm, exportToPDF } = usePrintFunction();

  // Derived values
  const isExpired = entry.expires_at && 
    new Date(entry.expires_at) < new Date();
  
  const answers = entry.answers as Record<string, string> || {};
  const hasAnswers = entry.answers && Object.keys(answers).length > 0;

  // Handle operations
  const handleSaveNotes = () => {
    saveNotes(notes);
  };

  const handleSavePatientEmail = () => {
    savePatientEmail(patientEmail);
    setIsEditing(false);
  };

  const handleSendLink = () => {
    if (patientEmail) {
      sendLink(patientEmail);
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatus(newStatus, notes);
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
      setPatientEmail(entry.patient_email || "");
    }
  };

  return {
    // State
    notes,
    patientEmail,
    isEditing,
    activeTab,
    isExpired,
    answers,
    hasAnswers,
    
    // Mutations
    updateEntryMutation,
    sendLinkMutation,
    
    // Actions
    setNotes,
    setPatientEmail,
    setActiveTab,
    toggleEditing,
    handleSaveNotes,
    handleSavePatientEmail,
    handleSendLink,
    handleStatusUpdate,
    copyLinkToClipboard,
    
    // Print functions
    showPrintPreview,
    printForm,
    exportToPDF
  };
}
