
/**
 * This hook was originally created to provide printing functionality.
 * It has been refactored to remove all printing features as they are no longer needed.
 * The hook is kept as a stub to avoid breaking changes in components that may 
 * still import it but don't use its functionality.
 */

import { useState } from "react";

export const usePrintFunction = () => {
  // This is now just a stub that returns nothing functional
  return {
    showPrintPreview: false
  };
};
