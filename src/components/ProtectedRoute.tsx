
/**
 * Protected route component that restricts access to routes based on authentication
 * and role requirements. Provides custom UI for unauthorized access scenarios.
 */

import { useAuth, useOrganization, RedirectToSignIn } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[]; // Modified to accept array of roles
  requireOpticianRole?: boolean; // Added for optician-specific pages
}

const ProtectedRoute = ({ children, requireRole, requireOpticianRole }: ProtectedRouteProps) => {
  const { isLoaded: isAuthLoaded, userId, has } = useAuth();
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { supabase, isReady } = useSupabaseClient();
  const [isOpticianRoleChecked, setIsOpticianRoleChecked] = useState(!requireOpticianRole);
  const [isUserOptician, setIsUserOptician] = useState(false);

  // Check if user is Admin through Clerk roles
  const isAdmin = has({ role: "org:admin" });

  // Check Clerk roles
  useEffect(() => {
    if (isAuthLoaded && isOrgLoaded) {
      // Check if user is logged in
      if (!userId) {
        setIsAuthorized(false);
        return;
      }

      // If no specific role is required, just check user authentication
      if (!requireRole && !requireOpticianRole) {
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

  // Check Supabase optician role if needed
  useEffect(() => {
    const checkOpticianRole = async () => {
      if (!userId || !isReady || !requireOpticianRole) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', userId)
          .single();
          
        if (error) {
          console.error("Error fetching user role:", error);
          setIsUserOptician(false);
        } else {
          setIsUserOptician(data?.role === 'optician');
        }
      } catch (error) {
        console.error("Error checking optician role:", error);
        setIsUserOptician(false);
      } finally {
        setIsOpticianRoleChecked(true);
      }
    };
    
    if (requireOpticianRole && userId && isReady) {
      checkOpticianRole();
    }
  }, [userId, isReady, supabase, requireOpticianRole]);

  // Admins can bypass optician role requirement
  const isFinallyAuthorized = isAuthorized && (
    !requireOpticianRole || isUserOptician || isAdmin
  );

  // Show loading state
  if (!isAuthLoaded || !isOrgLoaded || isAuthorized === null || !isOpticianRoleChecked) {
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold mb-4">Behörighet saknas</h2>
        <p className="text-gray-600 mb-6 text-center">
          {requireOpticianRole && !isUserOptician && !isAdmin
            ? "Du har inte optikerbehörighet för denna sida."
            : "Du har inte tillräckliga behörigheter för att komma åt denna sida."}
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
  if (isFinallyAuthorized && !organization && requireRole) {
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
