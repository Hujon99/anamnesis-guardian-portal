
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission.
 * The form template is fetched from the anamnes_forms table via the verify-token
 * edge function to avoid RLS issues.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, FileQuestion, AlertTriangle, RefreshCw } from "lucide-react";
import { FormTemplate } from "@/types/anamnesis";
import { FormWrapper } from "@/components/PatientForm/FormWrapper";

// Import the Supabase anon key from the client
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<any>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setDiagnosticInfo(null);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Ingen token angiven. Kontrollera länken du fick.");
        setLoading(false);
        return;
      }

      try {
        console.log(`Verifying token (attempt ${retryCount + 1}): ${token.substring(0, 6)}...`);
        
        // Call the verify-token edge function without Authorization header
        // since we've configured it to not require JWT verification
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
          
          setDiagnosticInfo(diagnostic);
          
          // Handle different error cases based on error code
          if (response.data?.code === 'expired' || response.data?.status === 'expired') {
            setExpired(true);
          } else if (
            response.data?.code === 'already_submitted' || 
            response.data?.status === 'pending' || 
            response.data?.status === 'ready' || 
            response.data?.status === 'reviewed'
          ) {
            setSubmitted(true);
          } else {
            // Set both the error message and error code
            setError(response.error.message || response.data?.error || "Ogiltig eller utgången token.");
            setErrorCode(response.data?.code || "unknown_error");
          }
          
          setLoading(false);
          return;
        }

        if (response.data?.success) {
          // Get entry data from response
          const entryData = response.data.entry;
          console.log("Entry data received:", entryData);
          setEntryData(entryData);
          
          // Get form template data from response
          const formTemplateData = response.data.formTemplate;
          console.log("Form template received:", formTemplateData);
          
          if (formTemplateData) {
            setFormTemplate(formTemplateData.schema);
            
            // If this form has already been filled, show submitted state
            if (entryData.status === 'pending' || 
                entryData.status === 'ready' || 
                entryData.status === 'reviewed') {
              setSubmitted(true);
            }
          } else {
            console.error("No form template found in response");
            setError("Inget formulär hittades för denna organisation.");
          }
        } else {
          console.error("Invalid response structure:", response);
          setError("Kunde inte verifiera åtkomst. Kontakta din optiker.");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("Ett tekniskt fel uppstod. Försök igen senare.");
        setDiagnosticInfo(`Technical error: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, retryCount]);

  const handleFormSubmit = async (values: any) => {
    if (!token) return;
    
    try {
      setSubmitLoading(true);
      const formMetadata = {
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      };
      
      // Submit the form without using the Authorization header
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: values,
          formData: formMetadata
        }
      });

      if (response.error) {
        if (response.error.message.includes('gått ut') || response.data?.status === 'expired') {
          setExpired(true);
        } else {
          setError(response.error.message || "Det gick inte att skicka formuläret.");
        }
        setSubmitLoading(false);
        return;
      }

      setSubmitted(true);
      setSubmitLoading(false);
    } catch (err) {
      console.error("Error submitting form:", err);
      setError("Ett tekniskt fel uppstod vid inskickning. Försök igen senare.");
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Laddar formulär...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle className="text-center text-yellow-600">Länken har gått ut</CardTitle>
            <CardDescription className="text-center">
              Denna länk är inte längre giltig.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Utgången länk</AlertTitle>
              <AlertDescription>
                Länken du försöker använda har gått ut. Kontakta din optiker för att få en ny länk.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Om du har frågor, kontakta din optiker direkt.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center text-destructive">Åtkomst nekad</CardTitle>
            <CardDescription className="text-center">
              {errorCode === 'server_error' 
                ? 'Ett tekniskt problem uppstod när vi försökte verifiera din åtkomst.' 
                : 'Vi kunde inte verifiera din åtkomst till formuläret.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            {errorCode && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Felkod: {errorCode}</p>
              </div>
            )}
            
            {diagnosticInfo && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 overflow-auto max-h-32">
                <pre>{diagnosticInfo}</pre>
              </div>
            )}
            
            <div className="mt-6">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Försök igen
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Om du fick länken via SMS, kontrollera att du kopierat hela länken. 
              Vid fortsatta problem, kontakta din optiker och nämn felkoden ovan.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-center text-green-600">Tack för dina svar!</CardTitle>
            <CardDescription className="text-center">
              Din anamnes har skickats in och kommer att granskas av din optiker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Din optiker kommer att använda denna information för att förbereda din undersökning.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center flex-col gap-4">
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Nästa steg</AlertTitle>
              <AlertDescription>
                Din optiker kommer att gå igenom dina svar. Du behöver inte göra något mer just nu.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Du kan nu stänga denna sida.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {formTemplate ? (
          <FormWrapper 
            formTemplate={formTemplate}
            onSubmit={handleFormSubmit}
            isSubmitting={submitLoading}
          />
        ) : (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4 text-gray-600">Laddar formulärmall...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientFormPage;
