
import { useState } from "react";

export const usePrintFunction = () => {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Removed print and export functions completely
  return {
    showPrintPreview: false
  };
};
