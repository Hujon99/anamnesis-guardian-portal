
/**
 * Protected route component that restricts access to routes based on authentication
 * and role requirements. Provides custom UI for unauthorized access scenarios.
 */

import { RedirectToSignIn } from "@clerk/clerk-react";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole | UserRole[]; // Roles required from Supabase
  requireClerkRole?: string | string[]; // Clerk organization roles (legacy support)
}

const ProtectedRoute = ({ children, requireRole, requireClerkRole }: ProtectedRouteProps) => {
  const auth = useAuth();
  const { isLoaded: isAuthLoaded, userId } = auth;
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const [isClerkAuthorized, setIsClerkAuthorized] = useState<boolean | null>(null);
  const { role: userRole, isLoading: isRoleLoading, isAdmin } = useUserRole();

  // Check Clerk roles (legacy support)
  useEffect(() => {
    if (isAuthLoaded && isOrgLoaded) {
      if (!userId) {
        setIsClerkAuthorized(false);
        return;
      }

      if (!requireClerkRole) {
        setIsClerkAuthorized(true);
        return;
      }

      if (requireClerkRole && organization && auth.has) {
        if (Array.isArray(requireClerkRole)) {
          const hasAnyRole = requireClerkRole.some(role => auth.has({ role }));
          setIsClerkAuthorized(hasAnyRole);
        } else {
          const hasRole = auth.has({ role: requireClerkRole });
          setIsClerkAuthorized(hasRole);
        }
      } else if (requireClerkRole) {
        setIsClerkAuthorized(false);
      } else {
        setIsClerkAuthorized(true);
      }
    }
  }, [isAuthLoaded, isOrgLoaded, userId, organization, requireClerkRole, auth]);

  // Check Supabase role authorization
  const hasSupabaseRole = () => {
    if (!requireRole || !userRole) return true;

    if (Array.isArray(requireRole)) {
      return requireRole.includes(userRole);
    }

    return userRole === requireRole;
  };

  const isSupabaseAuthorized = !requireRole || hasSupabaseRole();
  const isFinallyAuthorized = isClerkAuthorized && isSupabaseAuthorized;

  // Show loading state
  if (!isAuthLoaded || !isOrgLoaded || isClerkAuthorized === null || (requireRole && isRoleLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifierar behörighet...</p>
      </div>
    );
  }

  // Redirect to sign-in if not authorized
  if (!userId) {
    return <RedirectToSignIn />;
  }

  // If not authorized due to missing role
  if (userId && !isFinallyAuthorized) {
    const getRoleMessage = () => {
      if (requireRole) {
        const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
        const roleNames = roles.map(r => {
          switch (r) {
            case 'admin': return 'administratör';
            case 'optician': return 'optiker';
            case 'member': return 'medlem';
            default: return r;
          }
        });
        return `Du måste vara ${roleNames.join(' eller ')} för att komma åt denna sida.`;
      }
      return "Du har inte tillräckliga behörigheter för att komma åt denna sida.";
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-4">Behörighet saknas</h2>
        <p className="text-gray-600 mb-6 text-center">
          {getRoleMessage()}
        </p>
        <a 
          href="/dashboard" 
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Återgå till översikten
        </a>
      </div>
    );
  }

  // If no organization, show a message
  if (isFinallyAuthorized && !organization && (requireRole || requireClerkRole)) {
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
