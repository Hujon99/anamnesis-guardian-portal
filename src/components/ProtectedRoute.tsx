
import { useAuth, useOrganization, RedirectToSignIn } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[]; // Modified to accept array of roles
}

const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { isLoaded: isAuthLoaded, userId, has } = useAuth();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthLoaded && isOrgLoaded) {
      // Check if user is logged in
      if (!userId) {
        setIsAuthorized(false);
        return;
      }

      // If no specific role is required, just check user authentication
      if (!requireRole) {
        setIsAuthorized(true);
        return;
      }

      // Check if user has any of the required roles
      if (requireRole && organization) {
        // Handle both string and array of strings
        if (Array.isArray(requireRole)) {
          const hasAnyRole = requireRole.some(role => has({ role }));
          setIsAuthorized(hasAnyRole);
        } else {
          const hasRole = has({ role: requireRole });
          setIsAuthorized(hasRole);
        }
      } else if (requireRole) {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [isAuthLoaded, isOrgLoaded, userId, organization, requireRole, has]);

  // Show loading state
  if (!isAuthLoaded || !isOrgLoaded || isAuthorized === null) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  // Redirect to sign-in if not authorized
  if (!userId) {
    return <RedirectToSignIn />;
  }

  // If not authorized due to missing role
  if (userId && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-4">Behörighet saknas</h2>
        <p className="text-gray-600 mb-6 text-center">
          Du har inte tillräckliga behörigheter för att komma åt denna sida.
        </p>
      </div>
    );
  }

  // If no organization, show a message
  if (isAuthorized && !organization && requireRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-4">Organisation krävs</h2>
        <p className="text-gray-600 mb-6 text-center">
          Du måste skapa eller tillhöra en organisation för att använda Anamnesportalen.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
