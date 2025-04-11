
/**
 * This hook handles the verification of access tokens for anamnesis forms.
 * It checks if tokens are valid, expired, or already used, and fetches
 * the associated form template. It provides different states for different
 * token statuses, making it easy to display the correct UI to users.
 */

import { useState, useEffect } from "react";
import { useSupabaseClient } from "./useSupabaseClient";
import { FormTemplate, AnamnesesEntry } from "@/types/anamnesis";

interface VerificationResult {
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  diagnosticInfo: string | null;
  expired: boolean;
  submitted: boolean;
  formTemplate: FormTemplate | null;
  entryData: AnamnesesEntry | null;
  handleRetry: () => void;
}

export function useTokenVerification(token: string | null): VerificationResult {
  const { supabase, isReady } = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [entryData, setEntryData] = useState<AnamnesesEntry | null>(null);

  const verifyToken = async () => {
    if (!token) {
      setError("Token saknas i URL");
      setErrorCode("missing_token");
      setLoading(false);
      return;
    }

    if (!isReady) {
      console.log("Supabase client not ready yet, waiting...");
      return;
    }

    try {
      setLoading(true);
      
      console.log(`Verifying token: ${token.substring(0, 6)}...`);
      
      // Call the verify-token edge function with the token in the request body
      const { data, error } = await supabase.functions.invoke("verify-token", {
        body: { token }
      });
      
      if (error) {
        console.error("Error verifying token:", error);
        setError(error.message || "Ett fel uppstod vid verifiering av token");
        setErrorCode("api_error");
        setDiagnosticInfo(JSON.stringify(error));
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.error("No data returned from verify-token function");
        setError("Ingen data returnerades från verifieringsfunktionen");
        setErrorCode("no_data");
        setLoading(false);
        return;
      }
      
      console.log("Verify token response:", data);
      
      // Handle edge function response status
      if (data.status === 'expired') {
        console.log("Token is expired");
        setExpired(true);
        setLoading(false);
        return;
      }
      
      if (data.status === 'already_submitted') {
        console.log("Form already submitted");
        setSubmitted(true);
        setLoading(false);
        return;
      }
      
      // Handle successful verification
      if (data.entry && data.formTemplate) {
        console.log("Token verified successfully", data);
        
        // Store both the form template and the entry data
        setFormTemplate(data.formTemplate as FormTemplate);
        setEntryData(data.entry as AnamnesesEntry);
        
        setError(null);
        setErrorCode(null);
      } else {
        console.error("Invalid response format from verify-token function");
        setError("Ogiltig respons från verifieringsfunktionen");
        setErrorCode("invalid_response");
        setDiagnosticInfo(JSON.stringify(data));
      }
    } catch (err: any) {
      console.error("Error in token verification:", err);
      setError(err.message || "Ett oväntat fel uppstod");
      setErrorCode("unexpected_error");
      setDiagnosticInfo(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setErrorCode(null);
    setDiagnosticInfo(null);
    setExpired(false);
    setSubmitted(false);
    setFormTemplate(null);
    setLoading(true);
    verifyToken();
  };

  useEffect(() => {
    if (token && isReady) {
      verifyToken();
    } else if (!token) {
      // Handle missing token case
      setError("Token saknas i URL");
      setErrorCode("missing_token");
      setLoading(false);
    }
  }, [token, isReady]);

  return {
    loading,
    error,
    errorCode,
    diagnosticInfo,
    expired,
    submitted,
    formTemplate,
    entryData,
    handleRetry
  };
}
