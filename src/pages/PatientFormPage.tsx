
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission
 * using a modular approach with dedicated components and hooks.
 * Enhanced to support magic links, auto-saving functionality, smooth transitions
 * between loading and form display, and improved error handling with debugging
 * information for better troubleshooting.
 * Now uses FormLayout to properly display sidebar for authenticated opticians
 * while maintaining clean layout for patients accessing via magic links.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import FormLayout from "@/components/FormLayout";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const { userId } = useAuth();
  const token = searchParams.get("token");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Check if this is an optician accessing the form (any authenticated user)
  const isOpticianMode = !!userId;
  
  // Log token for debugging
  useEffect(() => {
    if (token) {
      console.log("PatientFormPage: Rendering with token", token.substring(0, 6) + "...");
      if (isOpticianMode) {
        console.log("PatientFormPage: Optician mode detected - showing sidebar");
      }
    } else {
      console.log("PatientFormPage: No token in URL");
      toast.error("Ingen åtkomsttoken hittades", {
        description: "Kontrollera att URL:en är korrekt"
      });
    }
  }, [token, isOpticianMode]);
  
  // Add ability to handle token expiration by refreshing the page
  const handleTokenError = (error: Error) => {
    if (error.message?.includes('JWT') || error.message?.includes('token')) {
      toast.error("Din session har gått ut", {
        description: "Formuläret kommer att laddas om för att förnya sessionen",
        duration: 5000
      });
      
      // Wait a moment before refreshing
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 5000);
    }
  };
  
  // Use FormLayout which handles sidebar display based on authentication status
  return (
    <FormLayout>
      <BaseFormPage 
        token={token}
        mode="patient"
        showBookingInfo={true}
        key={`patient-form-${refreshTrigger}`}
        onError={handleTokenError}
      />
    </FormLayout>
  );
};

export default PatientFormPage;
