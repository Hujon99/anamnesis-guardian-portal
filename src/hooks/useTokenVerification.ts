
/**
 * This hook verifies the token for accessing the anamnesis form.
 * It handles loading states, errors, and fetches the appropriate form template
 * and entry data based on the provided token.
 * Updated to work with FormTemplateWithMeta instead of just FormTemplate.
 */

import { useState, useEffect } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { useFormTemplate, FormTemplateWithMeta } from "./useFormTemplate";
import { useTokenManager } from "./useTokenManager";
import { AnamnesesEntry } from "@/types/anamnesis";

interface UseTokenVerificationResult {
  loading: boolean;
  error: string | null;
  errorCode: string;
  diagnosticInfo: string;
  expired: boolean;
  submitted: boolean;
  formTemplate: FormTemplateWithMeta | null;
  entryData: AnamnesesEntry | null;
  handleRetry: () => void;
}

export const useTokenVerification = (token: string | null): UseTokenVerificationResult => {
  const { supabase } = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [diagnosticInfo, setDiagnosticInfo] = useState("");
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<AnamnesesEntry | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  
  // Use the token manager hook to validate the token, passing the supabase client
  const tokenManager = useTokenManager(supabase);
  
  // Get the form template for the organization
  const { data: formTemplate, refetch: refetchFormTemplate } = useFormTemplate(organizationId);
  
  // Function to handle retrying the verification process
  const handleRetry = () => {
    console.log("[useTokenVerification/handleRetry]: Retrying token verification");
    setLoading(true);
    setError(null);
    setErrorCode("");
    setDiagnosticInfo("");
    setExpired(false);
    setSubmitted(false);
    tokenManager.resetVerification(); // Fixed: removed the parameter
    refetchFormTemplate();
  };
  
  // Effect to verify the token and fetch entry data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          setError("Ingen åtkomsttoken angiven");
          setLoading(false);
          return;
        }
        
        if (!supabase) {
          setError("Kunde inte ansluta till databasen");
          setLoading(false);
          return;
        }
        
        console.log("[useTokenVerification]: Verifying token:", token.substring(0, 6) + "...");
        
        // Verify the token first
        const { valid, error: verificationErr, entry, expired: isExpired } = await tokenManager.verifyToken(token);
        
        if (!valid || verificationErr || !entry) {
          console.error("[useTokenVerification]: Token verification failed:", verificationErr);
          
          if (isExpired || verificationErr?.includes("expired")) {
            setExpired(true);
          } else {
            setError(verificationErr || "Ogiltig åtkomsttoken");
            setErrorCode("invalid_token");
            setDiagnosticInfo(`Token: ${token.substring(0, 6)}..., Error: ${verificationErr || "Unknown"}`);
          }
          
          setLoading(false);
          return;
        }
        
        console.log("[useTokenVerification]: Token verified successfully, entry:", entry);
        
        // Set organization ID from the entry
        setOrganizationId(entry.organization_id);
        setFormId(entry.form_id);
        
        // Check if the entry already has answers
        if (entry.answers) {
          console.log("[useTokenVerification]: Entry already has answers, marking as submitted");
          setSubmitted(true);
        }
        
        // Store the entry data
        setEntryData(entry);
        
        // Refetch form template with the organization ID
        await refetchFormTemplate();
        
        setLoading(false);
      } catch (err: any) {
        console.error("[useTokenVerification]: Error in fetchData:", err);
        setError("Ett oväntat fel uppstod: " + (err.message || "Okänt fel"));
        setErrorCode("unexpected");
        setDiagnosticInfo(JSON.stringify(err));
        setLoading(false);
      }
    };
    
    fetchData();
  }, [token, supabase, refetchFormTemplate, tokenManager]);
  
  return {
    loading: loading || tokenManager.isVerifying,
    error: error || tokenManager.verificationError,
    errorCode,
    diagnosticInfo,
    expired,
    submitted,
    formTemplate,
    entryData,
    handleRetry
  };
};
