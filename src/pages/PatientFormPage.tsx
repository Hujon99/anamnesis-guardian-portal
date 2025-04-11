
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 */

import { useSearchParams } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import SubmittedCard from "@/components/PatientForm/StatusCards/SubmittedCard";
import FormContainer from "@/components/PatientForm/FormContainer";
import { useEffect } from "react";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  // For debugging purposes
  useEffect(() => {
    console.log("PatientFormPage rendered with token:", token ? `${token.substring(0, 6)}...` : 'null');
    
    // Check if we're on the correct path
    console.log("Current path:", window.location.pathname);
    console.log("Complete URL:", window.location.href);
  }, [token]);
  
  // Use custom hooks to handle token verification and form submission
  const { 
    loading, 
    error, 
    errorCode, 
    diagnosticInfo, 
    expired, 
    submitted,
    formTemplate,
    entryData,
    handleRetry 
  } = useTokenVerification(token);
  
  const { 
    isSubmitting, 
    error: submissionError, 
    isSubmitted, 
    submitForm 
  } = useFormSubmission();

  // Handle form submission with form template
  const handleFormSubmit = async (values: any, formattedAnswers?: any) => {
    if (!token) {
      console.error("Cannot submit form: No token provided");
      return;
    }
    console.log("Submitting form with token:", token.substring(0, 6) + "...");
    await submitForm(token, values, formTemplate, formattedAnswers);
  };

  // Get the responsible optician's name
  const createdByName = entryData?.created_by_name || null;

  // Render different UI states based on the form status
  
  // Debug info
  console.log("Form state:", { 
    loading, error, errorCode, expired, submitted, isSubmitted, 
    hasFormTemplate: !!formTemplate
  });
  
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
    return <SubmittedCard />;
  }

  // Submission error state
  if (submissionError) {
    return (
      <ErrorCard 
        error={submissionError.message || "Ett fel uppstod vid inskickning av formuläret"} 
        onRetry={() => handleFormSubmit({})} 
      />
    );
  }

  // Missing token state
  if (!token) {
    return (
      <ErrorCard 
        error="Ingen åtkomsttoken hittades i URL:en" 
        errorCode="missing_token"
        diagnosticInfo="Token parameter saknas i URL:en"
        onRetry={() => window.location.href = "/"}
      />
    );
  }

  // Form display state - default state
  return (
    <FormContainer
      formTemplate={formTemplate}
      onSubmit={handleFormSubmit}
      isSubmitting={isSubmitting}
      createdByName={createdByName}
    />
  );
};

export default PatientFormPage;
