
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 */

import { useSearchParams } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import FormContainer from "@/components/PatientForm/FormContainer";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  
  // Verify that this is indeed an optician mode form
  const isOpticianMode = mode === "optician";
  
  // Use custom hooks to handle token verification and form submission
  const { 
    loading, 
    error, 
    errorCode, 
    diagnosticInfo, 
    expired, 
    submitted,
    formTemplate,
    handleRetry 
  } = useTokenVerification(token);
  
  const { 
    isSubmitting, 
    error: submissionError, 
    isSubmitted, 
    submitForm 
  } = useFormSubmission();

  // If not in optician mode, redirect to dashboard
  useEffect(() => {
    if (!isOpticianMode && !loading) {
      navigate("/dashboard");
    }
  }, [isOpticianMode, loading, navigate]);

  // Handle form submission with form template
  const handleFormSubmit = async (values: any, formattedAnswers?: any) => {
    if (!token) return;
    
    // For optician submissions, we'll set some additional metadata
    const opticianSubmissionData = {
      ...values,
      _metadata: {
        submittedBy: "optician",
        autoSetStatus: "ready" // This will be used by the submit-form function to automatically set the status
      }
    };
    
    // Pass the optician metadata along with the form values
    await submitForm(token, opticianSubmissionData, formTemplate, formattedAnswers);
  };

  // Successful submission view for opticians
  const OpticianSubmittedView = () => (
    <Card className="max-w-md mx-auto mt-8 text-center">
      <CardHeader>
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
        <CardTitle>Formuläret har fyllts i</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          Formuläret har nu markerats som ifyllt av optiker och statusen är ändrad till "Klar för undersökning".
        </p>
        <Button onClick={() => navigate("/dashboard")} className="w-full">
          Tillbaka till översikten
        </Button>
      </CardContent>
    </Card>
  );

  // Render different UI states based on the form status
  
  // Loading state
  if (loading) {
    return <LoadingCard />;
  }

  // Expired token state
  if (expired) {
    return <ExpiredCard />;
  }

  // Error state
  if (error) {
    return (
      <ErrorCard 
        error={error} 
        errorCode={errorCode} 
        diagnosticInfo={diagnosticInfo} 
        onRetry={handleRetry} 
      />
    );
  }

  // Form already submitted state
  if (submitted || isSubmitted) {
    return <OpticianSubmittedView />;
  }

  // Submission error state
  if (submissionError) {
    return (
      <ErrorCard 
        error={submissionError.message || "Ett fel uppstod vid inskickning av formuläret"} 
        errorCode="" 
        diagnosticInfo="" 
        onRetry={() => handleFormSubmit({})} 
      />
    );
  }

  // Form display state - default state
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Optikerifyllning av anamnes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Fyll i detta formulär för patienten. När du är klar kommer anamnesen automatiskt att 
              markeras som "Klar för undersökning".
            </p>
          </CardContent>
        </Card>
        
        {formTemplate ? (
          <FormContainer
            formTemplate={formTemplate}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            isOpticianMode={isOpticianMode}
          />
        ) : (
          <ErrorCard 
            error="Kunde inte ladda formulärmallen" 
            errorCode="" 
            diagnosticInfo="" 
            onRetry={handleRetry} 
          />
        )}
      </div>
    </div>
  );
};

export default OpticianFormPage;
