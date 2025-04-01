
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string;
}

const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { isLoaded, userId, orgId, has } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (!userId) {
        setIsAuthorized(false);
        return;
      }

      if (!requireRole) {
        setIsAuthorized(true);
        return;
      }

      // Check if user has the required role
      if (orgId && requireRole) {
        const hasRole = has({ role: requireRole, orgId });
        setIsAuthorized(hasRole);
      } else {
        setIsAuthorized(false);
      }
    }
  }, [isLoaded, userId, orgId, requireRole, has]);

  if (!isLoaded || isAuthorized === null) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  if (!isAuthorized) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
