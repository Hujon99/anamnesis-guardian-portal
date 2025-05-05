
/**
 * This hook verifies the token for accessing the anamnesis form.
 * It handles loading states, errors, and fetches the appropriate form template
 * and entry data based on the provided token.
 * Enhanced with better state coordination to prevent flashing and ensure
 * all data is fully loaded before rendering the form.
 */

import { useState, useEffect, useRef } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { useFormTemplate, FormTemplateWithMeta } from "./useFormTemplate";
import { useTokenManager } from "./useTokenManager";
import { AnamnesesEntry } from "@/types/anamnesis";

interface UseTokenVerificationResult {
  loading: boolean;
  formLoading: boolean;  
  error: string | null;
  errorCode: string;
  diagnosticInfo: string;
  expired: boolean;
  submitted: boolean;
  formTemplate: FormTemplateWithMeta | null;
  entryData: AnamnesesEntry | null;
  handleRetry: () => void;
  isFullyLoaded: boolean;
}

export const useTokenVerification = (token: string | null): UseTokenVerificationResult => {
  const { supabase, isReady: isSupabaseReady } = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(true);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [diagnosticInfo, setDiagnosticInfo] = useState("");
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<AnamnesesEntry | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for state tracking and debouncing
  const isVerifyingRef = useRef(false);
  const lastVerificationTimeRef = useRef<number>(0);
  const verificationCooldownMs = 500; // Reduced cooldown period to prevent blocking legitimate state transitions
  const stableFormDataRef = useRef<boolean>(false);
  const isFullyLoadedAttemptCount = useRef(0);
  
  // Add circuit breaker to prevent infinite retries
  const MAX_RETRIES = 3;
  const requestInProgressRef = useRef(false);
  const circuitBrokenRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  
  // Use the token manager hook to validate the token, passing the supabase client
  const tokenManager = useTokenManager(supabase);
  
  // Get the form template for the organization
  const { 
    data: formTemplate, 
    refetch: refetchFormTemplate,
    isLoading: formTemplateLoading,
    isSuccess: formTemplateSuccess,
    isError: formTemplateError
  } = useFormTemplate();
  
  // Reset circuit breaker when token changes
  useEffect(() => {
    circuitBrokenRef.current = false;
    requestInProgressRef.current = false;
    isVerifyingRef.current = false;
    stableFormDataRef.current = false;
    lastErrorRef.current = null;
    lastVerificationTimeRef.current = 0;
    isFullyLoadedAttemptCount.current = 0;
    setRetryCount(0);
    setFormLoading(true);
    setIsFullyLoaded(false);
    
    // Log token for debugging
    if (token) {
      // console.log("[useTokenVerification]: New token received:", token.substring(0, 6) + "...");
    } else {
      // console.log("[useTokenVerification]: No token provided");
    }
  }, [token]);

  // Add a forced timeout to set isFullyLoaded=true if conditions seem right but it's not getting set
  useEffect(() => {
    // If we have the essential data but isFullyLoaded is still false
    if (!isFullyLoaded && 
        !loading && 
        !formLoading &&
        formTemplate && 
        entryData && 
        !error && 
        !expired && 
        !submitted) {
      
      isFullyLoadedAttemptCount.current += 1;
      // console.log(`[useTokenVerification]: Attempt #${isFullyLoadedAttemptCount.current} to set isFullyLoaded=true`);
      
      // Condition seems right but isFullyLoaded not set, try after a delay
      const forceFullyLoadedTimer = setTimeout(() => {
        if (!isFullyLoaded &&
            formTemplate && 
            entryData &&
            !error && 
            !expired && 
            !submitted) {
          console.log("[useTokenVerification]: Forcing isFullyLoaded=true after conditions held for 1 second");
          setIsFullyLoaded(true);
          setFormLoading(false);
        }
      }, 1000);
      
      return () => clearTimeout(forceFullyLoadedTimer);
    }
  }, [formTemplate, entryData, error, expired, submitted, loading, formLoading, isFullyLoaded]);

  // Unified status tracking - ensure we've met all conditions to mark as fully loaded
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerificationTimeRef.current;
    const verificationStable = timeSinceLastVerification > verificationCooldownMs;
    
    // Log all conditions for easier debugging
    const conditions = {
      loading: !loading,
      isVerifying: !isVerifyingRef.current,
      formTemplateSuccess,
      formTemplateLoading: !formTemplateLoading,
      verificationStable,
      hasEntryData: !!entryData,
      hasFormTemplate: !!formTemplate,
      noError: !error,
      notExpired: !expired,
      notSubmitted: !submitted
    };
    
    // console.log("[useTokenVerification]: Fully loaded conditions:", conditions);
    
    // Check for the ideal condition to set isFullyLoaded = true
    if (!loading && 
        !isVerifyingRef.current && 
        formTemplateSuccess && 
        !formTemplateLoading && 
        verificationStable &&
        entryData && 
        formTemplate && 
        !error && 
        !expired && 
        !submitted) {
      
      // Ensure we have stable data for a minimum period before marking as loaded
      if (!stableFormDataRef.current) {
        // console.log("[useTokenVerification]: All conditions met, setting stable data flag");
        stableFormDataRef.current = true;
        // Add a small delay to ensure all React updates have propagated
        const stabilityTimer = setTimeout(() => {
          // console.log("[useTokenVerification]: All conditions met and stable, marking as fully loaded");
          setFormLoading(false);
          setIsFullyLoaded(true);
        }, 300);
        
        return () => clearTimeout(stabilityTimer);
      }
    } else {
      // Only log and reset if it was previously stable
      if (stableFormDataRef.current) {
        // console.log("[useTokenVerification]: Conditions no longer met, resetting stable data flag");
        // console.log("[useTokenVerification]: Failed conditions:", 
        //   Object.entries(conditions)
        //     .filter(([_, value]) => !value)
        //     .map(([key]) => key)
        //     .join(", ")
        // );
        stableFormDataRef.current = false;
      }
    }
  }, [loading, formTemplateLoading, formTemplateSuccess, formTemplate, entryData, error, expired, submitted]);
  
  // Function to handle retrying the verification process
  const handleRetry = () => {
    // Don't retry if a request is already in progress
    if (requestInProgressRef.current || isVerifyingRef.current) {
      console.log("[useTokenVerification/handleRetry]: Request already in progress, ignoring retry");
      return;
    }
    
    // console.log("[useTokenVerification/handleRetry]: Retrying token verification");
    setLoading(true);
    setFormLoading(true);
    setIsFullyLoaded(false);
    setError(null);
    setErrorCode("");
    setDiagnosticInfo("");
    setExpired(false);
    setSubmitted(false);
    lastErrorRef.current = null;
    lastVerificationTimeRef.current = 0;
    stableFormDataRef.current = false;
    isFullyLoadedAttemptCount.current = 0;
    
    // Reset verification state
    tokenManager.resetVerification();
    
    // Reset circuit breaker
    circuitBrokenRef.current = false;
    
    // Reset request in progress
    requestInProgressRef.current = false;
    isVerifyingRef.current = false;
    
    // Increment retry count to prevent infinite loops
    setRetryCount((prev) => prev + 1);
    
    // Refetch form template
    refetchFormTemplate();
  };
  
  // Effect to verify the token and fetch entry data
  useEffect(() => {
    // Skip verification if Supabase client is not ready
    if (!isSupabaseReady) {
      // console.log("[useTokenVerification]: Supabase client not ready, skipping verification");
      return;
    }
    
    // Skip if circuit breaker is active
    if (circuitBrokenRef.current) {
      // console.log("[useTokenVerification]: Circuit breaker active, skipping verification");
      return;
    }
    
    // Add a guard against too many retries
    if (retryCount > MAX_RETRIES) {
      console.error("[useTokenVerification]: Too many retry attempts, stopping");
      setError("För många försök att läsa in formuläret. Försök igen senare.");
      setErrorCode("too_many_retries");
      setDiagnosticInfo("Maximum retry count exceeded: " + MAX_RETRIES);
      setLoading(false);
      setFormLoading(false);
      circuitBrokenRef.current = true;
      return;
    }
    
    // Skip if there's already a request in progress
    if (requestInProgressRef.current || isVerifyingRef.current) {
      // console.log("[useTokenVerification]: Request already in progress, skipping");
      return;
    }
    
    // Implement cooldown to prevent rapid verification attempts - reduced to allow more responsive state transitions
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerificationTimeRef.current;
    if (timeSinceLastVerification < verificationCooldownMs) {
      // console.log(`[useTokenVerification]: Cooldown period active (${timeSinceLastVerification}ms), skipping verification`);
      return;
    }
    
    const fetchData = async () => {
      // Mark request as in progress and update verification time
      requestInProgressRef.current = true;
      isVerifyingRef.current = true;
      lastVerificationTimeRef.current = Date.now();
      
      try {
        if (!token) {
          setError("Ingen åtkomsttoken angiven");
          setErrorCode("missing_token");
          setLoading(false);
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        if (!supabase) {
          setError("Kunde inte ansluta till databasen");
          setErrorCode("no_supabase_client");
          setLoading(false);
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // console.log("[useTokenVerification]: Verifying token:", token.substring(0, 6) + "...");
        
        // Verify the token first
        const verificationResult = await tokenManager.verifyToken(token);
        
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
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // Now that we know it's valid, we can safely access the entry property
        const entry = 'entry' in verificationResult ? verificationResult.entry : null;
        
        if (!entry) {
          console.error("[useTokenVerification]: Entry not found after successful verification");
          setError("Kunde inte hitta anamnesen");
          setErrorCode("entry_not_found");
          setLoading(false);
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        
        // Set organization ID from the entry
        setOrganizationId(entry.organization_id);
        setFormId(entry.form_id);
        
        // Check if the entry already has answers
        if (entry.answers) {
          console.log("[useTokenVerification]: Entry already has answers, marking as submitted");
          setSubmitted(true);
          setLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // Store the entry data
        setEntryData(entry);
        
        // Refetch form template with the organization ID
        await refetchFormTemplate();
        
        // Clear any previous errors
        setError(null);
        setErrorCode("");
        
        // Mark token verification as complete
        setLoading(false);
        requestInProgressRef.current = false;
        
        // We'll keep isVerifying true until the form template check completes
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
          // console.log("[useTokenVerification]: Network error, will retry automatically");
        } else {
          // Break the circuit for non-network errors or after max retries
          circuitBrokenRef.current = true;
          
          setError("Ett oväntat fel uppstod: " + (err.message || "Okänt fel"));
          setErrorCode("unexpected");
          setDiagnosticInfo(JSON.stringify(err));
        }
        
        setLoading(false);
        setFormLoading(false);
        requestInProgressRef.current = false;
        isVerifyingRef.current = false;
      }
    };
    
    fetchData();
  }, [token, supabase, refetchFormTemplate, tokenManager, retryCount, isSupabaseReady]);

  // Second effect - monitor the form template loading status
  useEffect(() => {
    // Only process if we've already verified the token (loading is false)
    if (loading || !entryData) {
      return;
    }
    
    if (formTemplateError) {
      console.error("[useTokenVerification]: Form template error");
      setError("Kunde inte ladda formulärmallen");
      setErrorCode("template_error");
      setFormLoading(false);
      isVerifyingRef.current = false;
    }
    
    // When form template is successfully loaded
    if (formTemplateSuccess && formTemplate) {
      console.log("[useTokenVerification]: Form template loaded successfully");
      isVerifyingRef.current = false;
      // formLoading will be set to false when all conditions are met in the unified state tracking effect
    }
  }, [formTemplateError, formTemplateSuccess, formTemplate, loading, entryData]);
  
  return {
    loading: loading || tokenManager.isVerifying,
    formLoading: formLoading || formTemplateLoading || loading || tokenManager.isVerifying || isVerifyingRef.current,
    error: error || tokenManager.verificationError,
    errorCode,
    diagnosticInfo,
    expired,
    submitted,
    formTemplate,
    entryData,
    handleRetry,
    isFullyLoaded
  };
};
