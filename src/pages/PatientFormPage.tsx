
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Enhanced to support magic links and auto-saving functionality.
 */

import { useSearchParams } from "react-router-dom";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEffect, useState } from "react";
import LoadingCard from "@/components/PatientForm/StatusCards/LoadingCard";
import ErrorCard from "@/components/PatientForm/StatusCards/ErrorCard";
import ExpiredCard from "@/components/PatientForm/StatusCards/ExpiredCard";
import SubmittedCard from "@/components/PatientForm/StatusCards/SubmittedCard";
import FormContainer from "@/components/PatientForm/FormContainer";
import BookingInfoCard from "@/components/PatientForm/BookingInfoCard";
import CopyLinkButton from "@/components/PatientForm/CopyLinkButton";
import AutoSaveIndicator from "@/components/PatientForm/AutoSaveIndicator";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [currentFormValues, setCurrentFormValues] = useState<Record<string, any> | null>(null);
  
  // Enhanced debugging
  useEffect(() => {
    console.log("PatientFormPage rendered with token:", token ? `${token.substring(0, 6)}...` : 'null');
    
    // Check if we're on the correct path
    console.log("Current path:", window.location.pathname);
    console.log("Complete URL:", window.location.href);
    console.log("Search params:", Object.fromEntries([...searchParams.entries()]));
  }, [token, searchParams]);
  
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

  // Setup auto-save functionality
  const {
    lastSaved,
    isSaving,
    error: saveError,
    saveFormData
  } = useAutoSave({
    token,
    formData: currentFormValues,
    enabled: !submitted && !isSubmitted && !!token,
    formTemplate
  });

  // Extract magic link info from entry data
  const isMagicLink = entryData?.is_magic_link || false;
  const bookingId = entryData?.booking_id || null;
  const firstName = entryData?.first_name || null;
  const bookingDate = entryData?.booking_date || null;
  const storeId = entryData?.store_id || null;

  // Add additional debug logging for the form template
  useEffect(() => {
    console.log("PatientFormPage: Form template received:", formTemplate);
    if (formTemplate) {
      console.log("PatientFormPage: Template title:", formTemplate.title);
      console.log("PatientFormPage: Template sections count:", formTemplate.schema?.sections?.length || 0);
      
      // Log detailed information about sections
      if (formTemplate.schema?.sections && formTemplate.schema.sections.length > 0) {
        formTemplate.schema.sections.forEach((section, idx) => {
          console.log(`PatientFormPage: Section ${idx + 1}: ${section.section_title}`);
          console.log(`PatientFormPage: Section ${idx + 1} questions count:`, section.questions?.length || 0);
        });
      } else {
        console.warn("PatientFormPage: Template has no sections!");
      }
    } else {
      console.warn("PatientFormPage: Template is null or undefined!");
    }
  }, [formTemplate]);

  // Handle form values change for auto-save
  const handleFormValuesChange = (values: Record<string, any>) => {
    setCurrentFormValues(values);
  };

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

  // Debug info
  useEffect(() => {
    console.log("Form state:", { 
      loading, error, errorCode, expired, submitted, isSubmitted, 
      hasFormTemplate: !!formTemplate,
      entryData: entryData ? `ID: ${entryData.id.substring(0, 8)}...` : null,
      isMagicLink
    });
  }, [loading, error, errorCode, expired, submitted, isSubmitted, formTemplate, entryData, isMagicLink]);
  
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
    <div className="space-y-4">
      {/* Show info card for magic link entries */}
      {isMagicLink && (
        <BookingInfoCard 
          firstName={firstName}
          bookingId={bookingId}
          bookingDate={bookingDate}
          storeId={storeId}
        />
      )}
      
      <Card>
        <CardContent className="p-0">
          {formTemplate && (
            <FormContainer
              formTemplate={formTemplate.schema}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              createdByName={createdByName}
              onFormValuesChange={handleFormValuesChange}
            />
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-0 pb-4 px-6">
          <AutoSaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
          <CopyLinkButton />
        </CardFooter>
      </Card>
    </div>
  );
};

export default PatientFormPage;
