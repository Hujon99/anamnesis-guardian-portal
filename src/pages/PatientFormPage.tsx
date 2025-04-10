/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import SubmittedCard from "@/components/PatientForm/StatusCards/SubmittedCard";
import FormContainer from "@/components/PatientForm/FormContainer";
import { useState } from "react";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [localSubmitted, setLocalSubmitted] = useState(false);

  // Use custom hooks to handle token verification
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

  // Use 'submitted' from token verification OR local state after successful submission
  if (submitted || localSubmitted) {
    return <SubmittedCard />;
  }

  // Ensure token exists before rendering FormContainer
  if (!token) {
    return <ErrorCard error="Token saknas i URL:en" errorCode="MISSING_TOKEN" onRetry={() => window.location.reload()} />;
  }

  // Form display state - Pass token and onSuccess handler
  return (
    <FormContainer
      formTemplate={formTemplate}
      token={token}
      onSuccess={() => {
        console.log("Patient submission successful");
        setLocalSubmitted(true);
      }}
    />
  );
};

export default PatientFormPage;
