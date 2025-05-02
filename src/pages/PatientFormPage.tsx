
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Uses the unified form submission approach with edge function + direct database fallback.
 */

import { useSearchParams } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  console.log("[PatientFormPage]: Rendering with token:", token?.substring(0, 6) + "...");
  console.log("[PatientFormPage]: Using unified submission with edge function + fallback for patient mode");
  
  return (
    <BaseFormPage 
      token={token}
      mode="patient"
      showBookingInfo={true}
      useUnifiedSubmission={true} // Always use the unified approach
    />
  );
};

export default PatientFormPage;
