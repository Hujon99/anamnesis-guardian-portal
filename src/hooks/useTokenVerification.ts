
/**
 * This hook handles the verification of patient access tokens.
 * It encapsulates the token validation logic, API calls, and various states
 * that can result from the verification process (loading, error, expired, etc).
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TokenVerificationState = {
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  diagnosticInfo: string | null;
  expired: boolean;
  submitted: boolean;
  entryData: any;
  formTemplate: any;
};

type TokenVerificationResult = TokenVerificationState & {
  handleRetry: () => void;
};

export const useTokenVerification = (token: string | null): TokenVerificationResult => {
  const [state, setState] = useState<TokenVerificationState>({
    loading: true,
    error: null,
    errorCode: null,
    diagnosticInfo: null,
    expired: false,
    submitted: false,
    entryData: null,
    formTemplate: null
  });
  
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      errorCode: null,
      diagnosticInfo: null
    }));
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setState(prev => ({
          ...prev,
          error: "Ingen token angiven. Kontrollera länken du fick.",
          loading: false
        }));
        return;
      }

      try {
        console.log(`Verifying token (attempt ${retryCount + 1}): ${token.substring(0, 6)}...`);
        
        // Call the verify-token edge function
        const response = await supabase.functions.invoke('verify-token', {
          body: { token }
        });

        console.log('Token verification response:', response);

        if (response.error) {
          console.error("Token verification failed:", response.error);
          
          // Collect diagnostic information
          let diagnostic = `Status: ${response.error?.status || 'Unknown'}\n`;
          diagnostic += `Message: ${response.error?.message || 'No message'}\n`;
          
          if (response.data) {
            diagnostic += `Data: ${JSON.stringify(response.data, null, 2)}\n`;
          }
          
          // Handle different error cases
          if (response.data?.code === 'expired' || response.data?.status === 'expired') {
            setState(prev => ({
              ...prev,
              expired: true,
              diagnosticInfo: diagnostic,
              loading: false
            }));
          } else if (
            response.data?.code === 'already_submitted' || 
            response.data?.status === 'pending' || 
            response.data?.status === 'ready' || 
            response.data?.status === 'reviewed'
          ) {
            setState(prev => ({
              ...prev,
              submitted: true,
              diagnosticInfo: diagnostic,
              loading: false
            }));
          } else {
            setState(prev => ({
              ...prev,
              error: response.error.message || response.data?.error || "Ogiltig eller utgången token.",
              errorCode: response.data?.code || "unknown_error",
              diagnosticInfo: diagnostic,
              loading: false
            }));
          }
          return;
        }

        if (response.data?.success) {
          // Get entry data from response
          const entryData = response.data.entry;
          console.log("Entry data received:", entryData);
          
          // Get form template data from response
          const formTemplateData = response.data.formTemplate;
          console.log("Form template received:", formTemplateData);
          
          if (formTemplateData) {
            // Check if this form has already been filled
            const isAlreadySubmitted = entryData.status === 'pending' || 
                                      entryData.status === 'ready' || 
                                      entryData.status === 'reviewed';
            
            setState(prev => ({
              ...prev,
              formTemplate: formTemplateData.schema,
              entryData,
              submitted: isAlreadySubmitted,
              loading: false
            }));
          } else {
            console.error("No form template found in response");
            setState(prev => ({
              ...prev,
              error: "Inget formulär hittades för denna organisation.",
              loading: false
            }));
          }
        } else {
          console.error("Invalid response structure:", response);
          setState(prev => ({
            ...prev,
            error: "Kunde inte verifiera åtkomst. Kontakta din optiker.",
            loading: false
          }));
        }
      } catch (err) {
        console.error("Error verifying token:", err);
        setState(prev => ({
          ...prev,
          error: "Ett tekniskt fel uppstod. Försök igen senare.",
          diagnosticInfo: `Technical error: ${err instanceof Error ? err.message : String(err)}`,
          loading: false
        }));
      }
    };

    verifyToken();
  }, [token, retryCount]);

  return { ...state, handleRetry };
};
