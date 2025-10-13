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
import { useFormTemplateByFormId, FormTemplateWithMeta as FormTemplateByIdWithMeta } from "./useFormTemplateByFormId";
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
  // State initialization
  const { supabase, isReady: isSupabaseReady } = useSupabaseClient();
  const [loading, setLoading] = useState(!!token);
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
  
  // Critical refs for stability
  const instanceIdRef = useRef<string>(`token-verify-${Math.random().toString(36).substring(2, 7)}`);
  const stableTokenRef = useRef<string | null>(token);
  const verificationCompletedRef = useRef<boolean>(false);
  const isVerifyingRef = useRef(false);
  const lastVerificationTimeRef = useRef<number>(0);
  const verificationCooldownMs = 3000; // Increased cooldown period
  const foundDataRef = useRef<boolean>(false);
  const mountTimeRef = useRef<number>(Date.now());
  const verificationStartedRef = useRef<boolean>(false);
  const lastVerifiedTokenRef = useRef<string | null>(null);
  
  // Safari detection and simplified circuit breaker
  const isSafari = useRef<boolean>(
    typeof window !== 'undefined' && 
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );
  const MAX_RETRIES = isSafari.current ? 2 : 3; // Safari: fewer retries
  const circuitBrokenRef = useRef(false);
  const requestInProgressRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  
  // Use the token manager hook
  const tokenManager = useTokenManager(supabase);

  // Update stable token when token changes
  useEffect(() => {
    if (token !== stableTokenRef.current) {
      if (isSafari.current) {
        console.log(`[useTokenVerification/Safari/${instanceIdRef.current}]: Token changed from ${stableTokenRef.current?.substring(0, 6) || 'null'} to ${token?.substring(0, 6) || 'null'}`);
      } else {
        console.log(`[useTokenVerification/${instanceIdRef.current}]: Token changed from ${stableTokenRef.current?.substring(0, 6) || 'null'} to ${token?.substring(0, 6) || 'null'}`);
      }
      stableTokenRef.current = token;
      
      // If we have a new token, we should reset the verification state
      if (token && token !== lastVerifiedTokenRef.current) {
        verificationCompletedRef.current = false;
        foundDataRef.current = false;
      }
    }
  }, [token]);
  
  // Get the form template - prioritize specific form_id if available
  // ONLY use useFormTemplate as fallback when no form_id exists
  const shouldUseFormId = !!formId;
  
  const { 
    data: formTemplate, 
    refetch: refetchFormTemplate,
    isLoading: formTemplateLoading,
    isSuccess: formTemplateSuccess,
    isError: formTemplateError
  } = useFormTemplate(undefined, { enabled: !shouldUseFormId });
  
  // Get specific form template by form_id if we have one
  const { 
    data: specificFormTemplate, 
    refetch: refetchSpecificFormTemplate,
    isLoading: specificFormTemplateLoading,
    isSuccess: specificFormTemplateSuccess,
    isError: specificFormTemplateError
  } = useFormTemplateByFormId(formId || undefined);
  
  // Determine which template to use - ALWAYS prioritize specific form template when formId exists
  const activeFormTemplate = shouldUseFormId ? specificFormTemplate : formTemplate;
  const activeFormTemplateLoading = shouldUseFormId ? specificFormTemplateLoading : formTemplateLoading;
  const activeFormTemplateSuccess = shouldUseFormId ? specificFormTemplateSuccess : formTemplateSuccess;
  const activeFormTemplateError = shouldUseFormId ? specificFormTemplateError : formTemplateError;
  const activeRefetchFormTemplate = shouldUseFormId ? refetchSpecificFormTemplate : refetchFormTemplate;
  
  // Circuit breaker reset when unmounting/remounting or token changes
  useEffect(() => {
    const effectiveToken = token || stableTokenRef.current;
    
    // Only reset for new tokens or on first mount
    if (lastVerifiedTokenRef.current !== effectiveToken || (!entryData && !error && !expired)) {
      console.log(`[useTokenVerification/${instanceIdRef.current}]: Initializing verification state for token: ${effectiveToken ? effectiveToken.substring(0, 6) + '...' : 'null'}`);
      
      // Don't reset if we've already verified this token successfully
      if (lastVerifiedTokenRef.current !== effectiveToken) {
        circuitBrokenRef.current = false;
        requestInProgressRef.current = false;
        isVerifyingRef.current = false;
        foundDataRef.current = false;
        lastErrorRef.current = null;
        lastVerificationTimeRef.current = 0;
        verificationStartedRef.current = false;
        mountTimeRef.current = Date.now();
        
        // Only reset verification state if the token actually changed
        if (effectiveToken !== lastVerifiedTokenRef.current) {
          verificationCompletedRef.current = false;
        }
        
        setRetryCount(0);
        setFormLoading(!!effectiveToken);
        setLoading(!!effectiveToken);
        setIsFullyLoaded(false);
        setError(null);
        setErrorCode("");
        setDiagnosticInfo("");
        setExpired(false);
        setSubmitted(false);
        
        // Don't clear entry data if we have the same token
        // This prevents flickering during remounts
        if (effectiveToken !== lastVerifiedTokenRef.current) {
          setEntryData(null);
        }
        
        // Reset token manager state only for new tokens
        tokenManager.resetVerification();
      }
    }
    
    return () => {
      // Don't do anything in cleanup that would reset state
      // This prevents issues during remounts
    };
  }, [token, tokenManager]);

  // Completion detection effect - mark as fully loaded when appropriate
  useEffect(() => {
    const effectiveToken = token || stableTokenRef.current;
    
    // Skip if no token
    if (!effectiveToken) return;
    
    // CRITICAL: All three must be present:
    // 1. Entry data from token verification
    // 2. Form template from template fetch
    // 3. No errors/expired/submitted states
    const hasAllRequiredData = 
      entryData && 
      activeFormTemplate && 
      activeFormTemplateSuccess &&
      !activeFormTemplateLoading &&
      !loading &&
      !isVerifyingRef.current &&
      !error &&
      !expired &&
      !submitted;
      
    if (hasAllRequiredData && !isFullyLoaded) {
      console.log(`[useTokenVerification/${instanceIdRef.current}]: All data loaded, marking as fully loaded`);
      setFormLoading(false);
      setIsFullyLoaded(true);
      verificationCompletedRef.current = true;
      foundDataRef.current = true;
    }
  }, [loading, activeFormTemplateLoading, activeFormTemplateSuccess, activeFormTemplate, entryData, error, expired, submitted, isFullyLoaded, token]);
  
  // Primary token verification effect
  useEffect(() => {
    const effectiveToken = token || stableTokenRef.current;
    
    // Skip if no token or verification already completed successfully
    if (!effectiveToken) {
      return;
    }
    
    // If verification is already completed AND we have data, skip
    if (verificationCompletedRef.current && entryData && activeFormTemplate) {
      return;
    }
    
    // Skip if same token was already verified successfully
    if (lastVerifiedTokenRef.current === effectiveToken && entryData) {
      // But still mark as fully loaded if needed
      if (!isFullyLoaded && activeFormTemplate) {
        setIsFullyLoaded(true);
        setFormLoading(false);
      }
      return;
    }
    
    // Skip if Supabase client is not ready
    if (!isSupabaseReady) {
      return;
    }
    
    // Skip if circuit breaker is active
    if (circuitBrokenRef.current) {
      return;
    }
    
    // Skip if verification is already in progress
    if (requestInProgressRef.current || isVerifyingRef.current) {
      return;
    }
    
    // Skip if we've had too many retries
    if (retryCount > MAX_RETRIES) {
      if (!error) {
        console.error(`[useTokenVerification/${instanceIdRef.current}]: Too many retry attempts, stopping`);
        setError("För många försök att läsa in formuläret. Försök igen senare.");
        setErrorCode("too_many_retries");
        setLoading(false);
        setFormLoading(false);
        circuitBrokenRef.current = true;
      }
      return;
    }
    
    // Safari-specific cooldown adjustments
    const now = Date.now();
    const cooldownPeriod = isSafari.current ? verificationCooldownMs * 1.5 : verificationCooldownMs;
    if (verificationStartedRef.current && (now - lastVerificationTimeRef.current) < cooldownPeriod) {
      return;
    }
    
    // Mark verification as started
    verificationStartedRef.current = true;
    
    const verifyToken = async () => {
      // Mark request as in progress
      requestInProgressRef.current = true;
      isVerifyingRef.current = true;
      lastVerificationTimeRef.current = Date.now();
      
      try {
        console.log(`[useTokenVerification/${instanceIdRef.current}]: Starting verification for token: ${effectiveToken.substring(0, 6)}...`);
        
        // Try cache first
        const cachedResult = tokenManager.getTokenFromCache(effectiveToken);
        if (cachedResult && 'verificationResult' in cachedResult && cachedResult.verificationResult) {
          console.log(`[useTokenVerification/${instanceIdRef.current}]: Using cached verification result`);
          
          const result = cachedResult.verificationResult;
          
          // Process cached result
          if (!result.valid) {
            const isExpired = 'expired' in result && result.expired === true;
            
            if (isExpired) {
              setExpired(true);
              setErrorCode("token_expired");
            } else {
              setError(result.error || "Ogiltig åtkomsttoken");
              setErrorCode("invalid_token");
            }
            
            setLoading(false);
            setFormLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Valid cached result
          const entry = 'entry' in result ? result.entry : null;
          
          if (!entry) {
            setError("Kunde inte hitta anamnesen");
            setErrorCode("entry_not_found");
            setLoading(false);
            setFormLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Check if submitted
          if (result.submitted) {
            setSubmitted(true);
            setLoading(false);
            requestInProgressRef.current = false;
            isVerifyingRef.current = false;
            return;
          }
          
          // Set data from entry
          setOrganizationId(entry.organization_id);
          setFormId(entry.form_id);
          setEntryData(entry);
          
          // Mark this token as verified
          lastVerifiedTokenRef.current = effectiveToken;
          foundDataRef.current = true;
          
          // Continue to fetch form template
          setLoading(false);
          await activeRefetchFormTemplate();
          requestInProgressRef.current = false;
          return;
        }
        
        // No cached result, verify token
        const verificationResult = await tokenManager.verifyToken(effectiveToken);
        
        if (!verificationResult.valid) {
          console.error(`[useTokenVerification/${instanceIdRef.current}]: Token verification failed:`, verificationResult.error);
          
          // Check if expired
          const isExpired = 'expired' in verificationResult && verificationResult.expired === true;
          
          if (isExpired || (verificationResult.error && verificationResult.error.includes("expired"))) {
            setExpired(true);
            setErrorCode("token_expired");
          } else {
            setError(verificationResult.error || "Ogiltig åtkomsttoken");
            setErrorCode("invalid_token");
            setDiagnosticInfo(`Token: ${effectiveToken.substring(0, 6)}..., Error: ${verificationResult.error || "Unknown"}`);
          }
          
          setLoading(false);
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // Valid result, get entry
        const entry = 'entry' in verificationResult ? verificationResult.entry : null;
        
        if (!entry) {
          console.error(`[useTokenVerification/${instanceIdRef.current}]: Entry not found after verification`);
          setError("Kunde inte hitta anamnesen");
          setErrorCode("entry_not_found");
          setLoading(false);
          setFormLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // Mark token as verified
        lastVerifiedTokenRef.current = effectiveToken;
        
        // Set organization ID from entry
        setOrganizationId(entry.organization_id);
        setFormId(entry.form_id);
        
        // Check if already submitted
        if (entry.status === 'submitted') {
          console.log(`[useTokenVerification/${instanceIdRef.current}]: Entry already submitted`);
          setSubmitted(true);
          setLoading(false);
          requestInProgressRef.current = false;
          isVerifyingRef.current = false;
          return;
        }
        
        // Store entry data
        setEntryData(entry);
        foundDataRef.current = true;
        
        // Fetch form template
        await activeRefetchFormTemplate();
        
        // Clear errors
        setError(null);
        setErrorCode("");
        
        // Mark verification as complete
        setLoading(false);
        requestInProgressRef.current = false;
        // Keep isVerifying true until form template is loaded
      } catch (err: any) {
        console.error(`[useTokenVerification/${instanceIdRef.current}]: Error verifying token:`, err);
        
        // Update error state
        setError("Ett oväntat fel uppstod: " + (err.message || "Okänt fel"));
        setErrorCode("unexpected");
        setDiagnosticInfo(JSON.stringify(err));
        
        // Reset verification state
        setLoading(false);
        setFormLoading(false);
        requestInProgressRef.current = false;
        isVerifyingRef.current = false;
        
        // Circuit breaker for repeated errors
        if (retryCount >= 2) {
          circuitBrokenRef.current = true;
        }
      }
    };
    
    // Start verification process
    verifyToken();
  }, [token, supabase, activeRefetchFormTemplate, tokenManager, retryCount, isSupabaseReady, entryData, activeFormTemplate, isFullyLoaded]);

  // Form template effect - handle form template loading status
  useEffect(() => {
    const effectiveToken = token || stableTokenRef.current;
    
    // Skip if no token or not verifying
    if (!effectiveToken || !entryData || !isVerifyingRef.current) {
      return;
    }
    
    // Handle form template error
    if (activeFormTemplateError) {
      console.error(`[useTokenVerification/${instanceIdRef.current}]: Form template error`);
      setError("Kunde inte ladda formulärmallen");
      setErrorCode("template_error");
      setFormLoading(false);
      isVerifyingRef.current = false;
    }
    
    // Handle form template success
    if (activeFormTemplateSuccess && activeFormTemplate) {
      console.log(`[useTokenVerification/${instanceIdRef.current}]: Form template loaded successfully`);
      isVerifyingRef.current = false;
      
      // CRITICAL: Only mark as completed if we also have entry data
      // Without entry data, we haven't actually verified the token yet
      if (entryData) {
        verificationCompletedRef.current = true;
        setIsFullyLoaded(true);
        setFormLoading(false);
      }
    }
  }, [activeFormTemplateError, activeFormTemplateSuccess, activeFormTemplate, token, entryData]);
  
  // Retry handler
  const handleRetry = () => {
    console.log(`[useTokenVerification/${instanceIdRef.current}]: Manual retry initiated`);
    
    // Reset verification state
    verificationCompletedRef.current = false;
    foundDataRef.current = false;
    lastVerifiedTokenRef.current = null;
    circuitBrokenRef.current = false;
    requestInProgressRef.current = false;
    isVerifyingRef.current = false;
    lastVerificationTimeRef.current = 0;
    verificationStartedRef.current = false;
    
    // Reset state
    setError(null);
    setErrorCode("");
    setDiagnosticInfo("");
    setExpired(false);
    setSubmitted(false);
    setEntryData(null);
    setIsFullyLoaded(false);
    setLoading(true);
    setFormLoading(true);
    
    // Reset token manager
    tokenManager.resetVerification();
    
    // Increment retry count
    setRetryCount(prev => prev + 1);
    
    // Trigger form template refetch
    activeRefetchFormTemplate();
  };
  
  // Return appropriate result for null token
  if (!token && !stableTokenRef.current) {
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
  
  // Return result for valid token
  return {
    loading,
    formLoading,
    error,
    errorCode,
    diagnosticInfo,
    expired,
    submitted,
    formTemplate: activeFormTemplate,
    entryData,
    handleRetry,
    isFullyLoaded
  };
};
