
/**
 * This hook verifies the token for accessing the anamnesis form.
 * It handles loading states, errors, and fetches the appropriate form template
 * and entry data based on the provided token.
 * Enhanced with better state coordination, aggressive debouncing, and circuit
 * breaker pattern to prevent excessive verification attempts.
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
  // Always initialize all states to consistent values regardless of token
  const { supabase, isReady: isSupabaseReady } = useSupabaseClient();
  const [loading, setLoading] = useState(!!token); // Only show loading if we have a token
  const [formLoading, setFormLoading] = useState(!!token);
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
  const verificationCooldownMs = 1000; // Increased cooldown period to prevent verification storms
  const stableFormDataRef = useRef<boolean>(false);
  const isFullyLoadedAttemptCount = useRef(0);
  const verificationInitiatedRef = useRef(false); // New flag to track if verification has been started
  
  // Add circuit breaker to prevent infinite retries
  const MAX_RETRIES = 3;
  const requestInProgressRef = useRef(false);
  const circuitBrokenRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  
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
  
  // Reset circuit breaker when token changes or component remounts
  useEffect(() => {
    // Clean reset of all state and refs
    console.log("[useTokenVerification/init]: Initializing with token:", token ? `${token.substring(0, 6)}...` : "null");
    
    // If no token, set appropriate initial state
    if (!token) {
      setLoading(false);
      setFormLoading(false);
      return;
    }
    
    circuitBrokenRef.current = false;
    requestInProgressRef.current = false;
    isVerifyingRef.current = false;
    stableFormDataRef.current = false;
    lastErrorRef.current = null;
    lastVerificationTimeRef.current = 0;
    isFullyLoadedAttemptCount.current = 0;
    verificationInitiatedRef.current = false;
    mountTimeRef.current = Date.now();
    
    setRetryCount(0);
    setFormLoading(true);
    setLoading(true);
    setIsFullyLoaded(false);
    setError(null);
    setErrorCode("");
    setDiagnosticInfo("");
    
    // Reset token manager state
    tokenManager.resetVerification();
    
    return () => {
      // Cleanup when unmounting or token changes
      console.log("[useTokenVerification/cleanup]: Cleaning up verification state");
    };
  }, [token, tokenManager]);

  // Add a forced timeout to set isFullyLoaded=true if conditions seem right but it's not getting set
  useEffect(() => {
    // If we don't have a token, skip this effect
    if (!token) return;
    
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
  }, [token, formTemplate, entryData, error, expired, submitted, loading, formLoading, isFullyLoaded]);

  // Unified status tracking - ensure we've met all conditions to mark as fully loaded
  useEffect(() => {
    // If no token, skip this effect
    if (!token) return;
    
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerificationTimeRef.current;
    const verificationStable = timeSinceLastVerification > verificationCooldownMs;
    
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
        stableFormDataRef.current = true;
        // Add a small delay to ensure all React updates have propagated
        const stabilityTimer = setTimeout(() => {
          console.log("[useTokenVerification]: All conditions met and stable, marking as fully loaded");
          setFormLoading(false);
          setIsFullyLoaded(true);
        }, 300);
        
        return () => clearTimeout(stabilityTimer);
      }
    } else {
      // Only log and reset if it was previously stable
      if (stableFormDataRef.current) {
        stableFormDataRef.current = false;
      }
    }
  }, [token, loading, formTemplateLoading, formTemplateSuccess, formTemplate, entryData, error, expired, submitted]);
  
  // Function to handle retrying the verification process
  const handleRetry = () => {
    console.log("[useTokenVerification/handleRetry]: Manually initiated retry");
    
    if (!token) {
      console.log("[useTokenVerification/handleRetry]: No token to verify, skipping retry");
      return;
    }
    
    // Don't retry if a request is already in progress
    if (requestInProgressRef.current || isVerifyingRef.current) {
      console.log("[useTokenVerification/handleRetry]: Request already in progress, ignoring retry");
      return;
    }
    
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
    verificationInitiatedRef.current = false;
    
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
  
  // Primary effect to verify the token and fetch entry data
  useEffect(() => {
    // If we don't have a token, skip verification completely
    if (!token) {
      // Set appropriate state for no token
      setLoading(false);
      setFormLoading(false);
      return;
    }
    
    // Skip if verification already completed successfully
    if (isFullyLoaded && entryData && formTemplate) {
      console.log("[useTokenVerification]: Already fully loaded, skipping verification");
      return;
    }
    
    // Skip verification if Supabase client is not ready
    if (!isSupabaseReady) {
      return;
    }
    
    // Skip if circuit breaker is active
    if (circuitBrokenRef.current) {
      return;
    }

    // Skip if verification has already been initiated and we're not explicitly retrying
    if (verificationInitiatedRef.current && retryCount === 0) {
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
      return;
    }
    
    // Implement cooldown to prevent rapid verification attempts
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerificationTimeRef.current;
    const timeSinceMount = now - mountTimeRef.current;
    
    // Add a minimum delay after mount before verification starts
    if (timeSinceMount < 300 && retryCount === 0) {
      const initialDelayTimer = setTimeout(() => {
        // Force a re-render to trigger this effect again after delay
        setRetryCount(c => c);
      }, 300 - timeSinceMount);
      
      return () => clearTimeout(initialDelayTimer);
    }
    
    if (timeSinceLastVerification < verificationCooldownMs) {
      return;
    }
    
    // Set flag that verification has been initiated
    verificationInitiatedRef.current = true;
    
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
        
        console.log("[useTokenVerification]: Starting token verification:", token.substring(0, 6) + "...");
        
        // Check if we already have a cached result
        const cachedResult = tokenManager.getTokenFromCache(token);
        if (cachedResult && 'verificationResult' in cachedResult && cachedResult.verificationResult) {
          console.log("[useTokenVerification]: Using cached verification result");
          
          const verificationResult = cachedResult.verificationResult;
          
          // Process the cached result
          if (!verificationResult.valid) {
            console.log("[useTokenVerification]: Cached result shows invalid token");
            const isExpired = 'expired' in verificationResult && verificationResult.expired === true;
            
            if (isExpired) {
              setExpired(true);
              setErrorCode("token_expired");
            } else {
              setError(verificationResult.error || "Ogiltig åtkomsttoken");
              setErrorCode("invalid_token");
            }
            
            setLoading(false);
            setFormLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Valid cached result - process the entry data
          const entry = 'entry' in verificationResult ? verificationResult.entry : null;
          
          if (!entry) {
            console.error("[useTokenVerification]: Entry not found in cached verification result");
            setError("Kunde inte hitta anamnesen");
            setErrorCode("entry_not_found");
            setLoading(false);
            setFormLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Check if submitted
          if (verificationResult.submitted) {
            console.log("[useTokenVerification]: Cached result shows form already submitted");
            setSubmitted(true);
            setLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Set organization ID and form ID from the entry
          setOrganizationId(entry.organization_id);
          setFormId(entry.form_id);
          
          // Store the entry data
          setEntryData(entry);
          
          // Mark verification as complete
          setLoading(false);
          
          // Continue to form template fetching
          await refetchFormTemplate();
          
          requestInProgressRef.current = false;
          return;
        }
        
        // No cached result, verify the token directly
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
          // Will retry automatically
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
  }, [token, supabase, refetchFormTemplate, tokenManager, retryCount, isSupabaseReady, isFullyLoaded, entryData, formTemplate]);

  // Second effect - monitor the form template loading status
  useEffect(() => {
    // If no token, skip this effect
    if (!token) return;
    
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
  }, [token, formTemplateError, formTemplateSuccess, formTemplate, loading, entryData]);
  
  // Return appropriate state for null token
  if (!token) {
    return {
      loading: false,
      formLoading: false,
      error: null,
      errorCode: "",
      diagnosticInfo: "",
      expired: false,
      submitted: false,
      formTemplate: null,
      entryData: null,
      handleRetry,
      isFullyLoaded: false
    };
  }
  
  // Return normal state for valid token
  return {
    loading,
    formLoading,
    error,
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
