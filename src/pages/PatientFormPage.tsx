
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Enhanced to support magic links, auto-saving functionality, and smooth transitions
 * between loading and form display using a state machine approach to prevent flashing.
 * Now includes improved error handling with a dedicated submission error state.
 * Updated to use the unified form submission hook by default.
 */

import { useSearchParams } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  return (
    <BaseFormPage 
      token={token}
      mode="patient"
      showBookingInfo={true}
      useUnifiedSubmission={true} // Now explicitly use the unified submission hook
    />
  );
};

export default PatientFormPage;
