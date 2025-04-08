
/**
 * This page serves as the entry point of the application.
 * It automatically redirects authenticated users to the dashboard
 * and unauthenticated users to the sign-in page.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const Index = () => {
  const { isSignedIn, isLoaded } = useAuth();
  
  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-2">Laddar...</h1>
          <p className="text-gray-600">Startar Anamnesportalen</p>
        </div>
      </div>
    );
  }
  
  // Redirect signed-in users to dashboard, others to sign-in
  return <Navigate to={isSignedIn ? "/dashboard" : "/sign-in"} replace />;
};

export default Index;
