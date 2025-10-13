
/**
 * This page serves as the entry point of the application.
 * It redirects authenticated users to the dashboard and shows
 * the sign-in page for unauthenticated users without redirecting.
 */

import { Navigate } from "react-router-dom";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import SignInPage from "./SignInPage";

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
  
  // Redirect signed-in users to dashboard, show sign-in for others (no redirect)
  return isSignedIn ? <Navigate to="/dashboard" replace /> : <SignInPage />;
};

export default Index;
