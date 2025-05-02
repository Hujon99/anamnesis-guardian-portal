
/**
 * This page renders a form specifically for opticians to fill out anamnesis forms for patients.
 * It extends the patient form functionality but shows additional comment fields 
 * and manages the form submission with the appropriate status for optician completion.
 * Uses the unified form submission hook that correctly preserves the reliable optician submission flow.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { useEffect } from "react";

const OpticianFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  
  // Verify that this is indeed an optician mode form
  const isOpticianMode = mode === "optician";
  
  // If not in optician mode, redirect to dashboard
  useEffect(() => {
    if (!isOpticianMode) {
      navigate("/dashboard");
    }
  }, [isOpticianMode, navigate]);
  
  console.log("[OpticianFormPage]: Rendering with token:", token?.substring(0, 6) + "...");
  
  return (
    <BaseFormPage 
      token={token}
      mode="optician"
      hideAutoSave={true}
      hideCopyLink={true}
      useUnifiedSubmission={true} // Use our unified approach that preserves the working optician submission
    />
  );
};

export default OpticianFormPage;
