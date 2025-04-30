
/**
 * This hook verifies the token for accessing the anamnesis form.
 * It handles loading states, errors, and fetches the appropriate form template
 * and entry data based on the provided token.
 * Updated to work with FormTemplateWithMeta instead of just FormTemplate.
 */

import { useState, useEffect, useRef } from "react";
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
  const { supabase, isReady: isSupabaseReady } = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [diagnosticInfo, setDiagnosticInfo] = useState("");
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<AnamnesesEntry | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Add circuit breaker to prevent infinite retries
  const MAX_RETRIES = 3; // Increased from 2 to 3
  const requestInProgressRef = useRef(false);
  const circuitBrokenRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  
  // Use the token manager hook to validate the token, passing the supabase client
  const tokenManager = useTokenManager(supabase);
  
  // Get the form template for the organization
  const { 
    data: formTemplate, 
    refetch: refetchFormTemplate,
    isLoading: formTemplateLoading
  } = useFormTemplate();
  
  // Reset circuit breaker when token changes
  useEffect(() => {
    circuitBrokenRef.current = false;
    requestInProgressRef.current = false;
    lastErrorRef.current = null;
    setRetryCount(0);
    
    // Log token for debugging
    if (token) {
      console.log("[useTokenVerification]: New token received:", token.substring(0, 6) + "...");
    } else {
      console.log("[useTokenVerification]: No token provided");
    }
  }, [token]);
  
  // Function to handle retrying the verification process
  const handleRetry = () => {
    // Don't retry if a request is already in progress
    if (requestInProgressRef.current) {
      console.log("[useTokenVerification/handleRetry]: Request already in progress, ignoring retry");
      return;
    }
    
    console.log("[useTokenVerification/handleRetry]: Retrying token verification");
    setLoading(true);
    setError(null);
    setErrorCode("");
    setDiagnosticInfo("");
    setExpired(false);
    setSubmitted(false);
    lastErrorRef.current = null;
    
    // Reset verification state
    tokenManager.resetVerification();
    
    // Reset circuit breaker
    circuitBrokenRef.current = false;
    
    // Reset request in progress
    requestInProgressRef.current = false;
    
    // Increment retry count to prevent infinite loops
    setRetryCount((prev) => prev + 1);
    
    // Refetch form template
    refetchFormTemplate();
  };
  
  // Effect to verify the token and fetch entry data
  useEffect(() => {
    // Skip verification if Supabase client is not ready
    if (!isSupabaseReady || formTemplateLoading) {
      return;
    }
    
    // Skip if circuit breaker is active
    if (circuitBrokenRef.current) {
      console.log("[useTokenVerification]: Circuit breaker active, skipping verification");
      return;
    }
    
    // Add a guard against too many retries
    if (retryCount > MAX_RETRIES) {
      console.error("[useTokenVerification]: Too many retry attempts, stopping");
      setError("För många försök att läsa in formuläret. Försök igen senare.");
      setErrorCode("too_many_retries");
      setDiagnosticInfo("Maximum retry count exceeded: " + MAX_RETRIES);
      setLoading(false);
      circuitBrokenRef.current = true;
      return;
    }
    
    // Skip if there's already a request in progress
    if (requestInProgressRef.current) {
      console.log("[useTokenVerification]: Request already in progress, skipping");
      return;
    }
    
    const fetchData = async () => {
      // Mark request as in progress
      requestInProgressRef.current = true;
      
      try {
        if (!token) {
          setError("Ingen åtkomsttoken angiven");
          setErrorCode("missing_token");
          setLoading(false);
          requestInProgressRef.current = false;
          return;
        }
        
        if (!supabase) {
          setError("Kunde inte ansluta till databasen");
          setErrorCode("no_supabase_client");
          setLoading(false);
          requestInProgressRef.current = false;
          return;
        }
        
        console.log("[useTokenVerification]: Verifying token:", token.substring(0, 6) + "...");
        
        // Verify the token first
        const verificationResult = await tokenManager.verifyToken(token);
        console.log("[useTokenVerification]: Verification result:", 
          verificationResult.valid ? "Valid" : "Invalid",
          verificationResult.error || ""
        );
        
        // Handle the different result types with proper type checking
        if (!verificationResult.valid) {
          console.error("[useTokenVerification]: Token verification failed:", verificationResult.error);
          
          // Save the error for future comparison
          lastErrorRef.current = verificationResult.error || "Unknown error";
          
          // Safely check if expired property exists and is true
          const isExpired = 'expired' in verificationResult && verificationResult.expired === true;
          
          if (isExpired || (verificationResult.error && verificationResult.error.includes("expired"))) {
            setExpired(true);
            setErrorCode("token_expired");
          } else {
            setError(verificationResult.error || "Ogiltig åtkomsttoken");
            setErrorCode("invalid_token");
            setDiagnosticInfo(`Token: ${token.substring(0, 6)}..., Error: ${verificationResult.error || "Unknown"}`);
          }
          
          setLoading(false);
          requestInProgressRef.current = false;
          return;
        }
        
        // Now that we know it's valid, we can safely access the entry property
        const entry = 'entry' in verificationResult ? verificationResult.entry : null;
        
        if (!entry) {
          console.error("[useTokenVerification]: Entry not found after successful verification");
          setError("Kunde inte hitta anamnesen");
          setErrorCode("entry_not_found");
          setLoading(false);
          requestInProgressRef.current = false;
          return;
        }
        
        console.log("[useTokenVerification]: Token verified successfully, entry:", 
          `ID: ${entry.id}, Organization: ${entry.organization_id}`);
        
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
        
        // Clear any previous errors
        setError(null);
        setErrorCode("");
        
        setLoading(false);
        requestInProgressRef.current = false;
      } catch (err: any) {
        console.error("[useTokenVerification]: Error in fetchData:", err);
        
        // If this is a network error, don't break the circuit on first try
        const isNetworkError = err.message?.includes("Failed to fetch") || 
                              err.message?.includes("Network") ||
                              err.message?.includes("network");
        
        // Compare with last error - if we're seeing the same error repeatedly, 
        // that suggests we might be in a loop
        const isSameError = lastErrorRef.current === err.message;
        lastErrorRef.current = err.message || "Unknown error";
                              
        if (isNetworkError && retryCount < MAX_RETRIES && !isSameError) {
          console.log("[useTokenVerification]: Network error, will retry automatically");
        } else {
          // Break the circuit for non-network errors or after max retries
          circuitBrokenRef.current = true;
          
          setError("Ett oväntat fel uppstod: " + (err.message || "Okänt fel"));
          setErrorCode("unexpected");
          setDiagnosticInfo(JSON.stringify(err));
        }
        
        setLoading(false);
        requestInProgressRef.current = false;
      }
    };
    
    fetchData();
  }, [token, supabase, refetchFormTemplate, tokenManager, retryCount, isSupabaseReady, formTemplateLoading]);
  
  return {
    loading: loading || tokenManager.isVerifying || formTemplateLoading,
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
