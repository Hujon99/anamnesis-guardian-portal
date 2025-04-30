
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useOpticianFormSubmission } from "@/hooks/useOpticianFormSubmission";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import OpticianFormContainer from "@/components/Optician/OpticianFormContainer";
import OpticianSubmittedView from "@/components/Optician/OpticianSubmittedView";
import { useEffect, useState } from "react";

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  
  // State to persist form values between submission attempts
  const [storedFormValues, setStoredFormValues] = useState<Record<string, any> | null>(null);
  const [storedFormattedAnswers, setStoredFormattedAnswers] = useState<any | null>(null);
  
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
    entryData,
    handleRetry 
  } = useTokenVerification(token);
  
  const {
    isSubmitting,
    submissionError,
    isSubmitted,
    localSubmitted,
    handleFormSubmit
  } = useOpticianFormSubmission(token);

  // Get the responsible optician's name
  const createdByName = entryData?.created_by_name || null;

  // If not in optician mode, redirect to dashboard
  useEffect(() => {
    if (!isOpticianMode && !loading) {
      navigate("/dashboard");
    }
  }, [isOpticianMode, loading, navigate]);

  // Debug the current path and token for troubleshooting
  useEffect(() => {
    console.log("[OpticianFormPage] Current path:", window.location.pathname);
    console.log("[OpticianFormPage] Token:", token ? `${token.substring(0, 6)}...` : 'null');
    console.log("[OpticianFormPage] Mode:", mode);
  }, [token, mode]);

  // Handler for form submission that stores the form values for potential retries
  const handleSubmitWithPersistence = async (values: any, formattedAnswers?: any) => {
    console.log("[OpticianFormPage/handleSubmitWithPersistence]: Storing form values for potential retry", values);
    
    // Store the values and formatted answers for potential retries
    setStoredFormValues(values);
    setStoredFormattedAnswers(formattedAnswers);
    
    // Proceed with submission
    await handleFormSubmit(values, formTemplate, formattedAnswers);
  };
  
  // Handle retry with stored form values
  const handleSubmissionRetry = async () => {
    console.log("[OpticianFormPage/handleSubmissionRetry]: Attempting retry with stored values", storedFormValues);
    
    if (storedFormValues) {
      // If we have stored values, use them for the retry
      await handleFormSubmit(storedFormValues, formTemplate, storedFormattedAnswers);
    } else {
      // If no stored values (unlikely), reset the process
      console.warn("[OpticianFormPage/handleSubmissionRetry]: No stored form values for retry, resetting");
      handleRetry();
    }
  };

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

  // Form already submitted state - check both global and local submitted state
  if (submitted || isSubmitted || localSubmitted) {
    return <OpticianSubmittedView />;
  }

  // Submission error state
  if (submissionError) {
    return (
      <ErrorCard 
        error={submissionError.message || "Ett fel uppstod vid inskickning av formuläret"} 
        errorCode="" 
        diagnosticInfo="" 
        onRetry={handleSubmissionRetry} 
      />
    );
  }

  // Form display state - default state
  return (
    <OpticianFormContainer
      formTemplate={formTemplate}
      onSubmit={handleSubmitWithPersistence}
      isSubmitting={isSubmitting}
      onRetry={handleRetry}
      initialValues={storedFormValues}
      createdByName={createdByName}
    />
  );
};

export default OpticianFormPage;
