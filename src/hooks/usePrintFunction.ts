
/**
 * This hook was originally created to provide printing functionality.
 * It has been refactored to remove all printing features as they are no longer needed.
 * The hook is kept as a stub to avoid breaking changes in components that may 
 * still import it but don't use its functionality.
 */

import { useState } from "react";

export const usePrintFunction = () => {
  // This is now just a stub that returns nothing functional
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // Even though these functions don't do anything now,
  // we provide them to maintain the API for any components that might use them
  const handlePrint = () => {
    console.log("[usePrintFunction]: Print function called (no-op)");
  };
  
  const togglePrintPreview = () => {
    console.log("[usePrintFunction]: Toggle print preview called (no-op)");
    setShowPrintPreview(false); // Always ensure it's false since functionality is removed
  };
  
  return {
    showPrintPreview,
    handlePrint,
    togglePrintPreview
  };
};
