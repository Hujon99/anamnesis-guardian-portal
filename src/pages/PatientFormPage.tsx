
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Now uses the unified form submission approach that restores the reliable direct database update method.
 */

import { useSearchParams } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  console.log("[PatientFormPage]: Rendering with token:", token?.substring(0, 6) + "...");
  
  return (
    <BaseFormPage 
      token={token}
      mode="patient"
      showBookingInfo={true}
      useUnifiedSubmission={true} // Use our unified approach that preserves the working direct database update
    />
  );
};

export default PatientFormPage;
