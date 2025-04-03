
/**
 * This component displays a loading state for the patient form.
 * It shows a spinner and loading message while the form is being loaded.
 */

import React from "react";
import { Loader2 } from "lucide-react";

const LoadingCard: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-gray-600">Laddar formulär...</p>
      </div>
    </div>
  );
};

export default LoadingCard;
