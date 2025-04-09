
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
import { useEffect } from "react";

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
    submissionError,
    isSubmitted,
    localSubmitted,
    handleFormSubmit
  } = useOpticianFormSubmission(token);

  // If not in optician mode, redirect to dashboard
  useEffect(() => {
    if (!isOpticianMode && !loading) {
      navigate("/dashboard");
    }
  }, [isOpticianMode, loading, navigate]);

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
        onRetry={() => handleFormSubmit({}, formTemplate)} 
      />
    );
  }

  // Form display state - default state
  return (
    <OpticianFormContainer
      formTemplate={formTemplate}
      onSubmit={handleFormSubmit}
      isSubmitting={isSubmitting}
      onRetry={handleRetry}
    />
  );
};

export default OpticianFormPage;
