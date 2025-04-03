
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

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
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

  // Handle form submission with form template
  const handleFormSubmit = async (values: any) => {
    if (!token) return;
    await submitForm(token, values, formTemplate);
  };

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
    return <SubmittedCard />;
  }

  // Submission error state
  if (submissionError) {
    return (
      <ErrorCard 
        error={submissionError} 
        onRetry={() => handleFormSubmit({})} 
      />
    );
  }

  // Form display state - default state
  return (
    <FormContainer
      formTemplate={formTemplate}
      onSubmit={handleFormSubmit}
      isSubmitting={isSubmitting}
    />
  );
};

export default PatientFormPage;
