/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import OpticianFormContainer from "@/components/Optician/OpticianFormContainer";
import OpticianSubmittedView from "@/components/Optician/OpticianSubmittedView";
import { useEffect } from "react";
import { toast } from "sonner";

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

  // If not in optician mode, redirect to dashboard
  useEffect(() => {
    if (!isOpticianMode && !loading) {
      navigate("/dashboard");
      return;
    }

    // Display notification for direct form filling mode
    if (isOpticianMode && !loading && formTemplate && !submitted) {
      toast.info("Du fyller nu i formuläret direkt i butiken");
    }
  }, [isOpticianMode, loading, navigate, formTemplate, submitted]);

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

  // Form already submitted state - rely only on token verification 'submitted' status
  if (submitted) {
    return <OpticianSubmittedView />;
  }

  // Form display state - default state
  if (!token) {
      return <ErrorCard error="Token saknas i URL:en" errorCode="MISSING_TOKEN" onRetry={() => window.location.reload()} />;
  }

  return (
    <OpticianFormContainer
      formTemplate={formTemplate}
      token={token}
      onRetry={handleRetry}
      onSuccess={() => {
          setTimeout(() => navigate('/dashboard'), 1500);
      }}
    />
  );
};

export default OpticianFormPage;
