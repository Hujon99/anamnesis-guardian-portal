
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Enhanced to support magic links, auto-saving functionality, smooth transitions
 * between loading and form display, and improved error handling with debugging
 * information for better troubleshooting.
 */

import React from "react";
import { useSearchParams } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { toast } from "sonner";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  // Log token for debugging
  React.useEffect(() => {
    if (token) {
      console.log("PatientFormPage: Rendering with token", token.substring(0, 6) + "...");
    } else {
      console.log("PatientFormPage: No token in URL");
      toast.error("Ingen åtkomsttoken hittades", {
        description: "Kontrollera att URL:en är korrekt"
      });
    }
  }, [token]);
  
  return (
    <BaseFormPage 
      token={token}
      mode="patient"
      showBookingInfo={true}
    />
  );
};

export default PatientFormPage;
