
/**
 * Hook that manages authentication flow for optician forms.
 * Handles redirects, token persistence, and authentication recovery.
 * Now safely handles cases where Clerk is not loaded.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { saveAuthContext, restoreAuthContext } from "@/utils/opticianFormTokenUtils";

interface UseOpticianFormAuthProps {
  mode: string | null;
  token: string | null;
  isInitializing: boolean;
  onTokenRestore: (token: string, mode: string) => void;
  clerkAvailable: boolean;
}

export const useOpticianFormAuth = ({
  mode,
  token,
  isInitializing,
  onTokenRestore,
  clerkAvailable
}: UseOpticianFormAuthProps) => {
  // Only use Clerk hooks if Clerk is available
  const authResult = clerkAvailable ? useAuth() : { isLoaded: true, isSignedIn: false };
  const { isLoaded: isAuthLoaded, isSignedIn } = authResult;
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigationInProgressRef = useRef<boolean>(false);
  const instanceId = useRef(`auth-${Math.random().toString(36).substring(2, 7)}`);

  // Handle non-authenticated users for optician mode
  useEffect(() => {
    // Skip if Clerk is not available or initialization is in progress
    if (!clerkAvailable || isInitializing || isRedirecting) return;
    
    const effectiveMode = mode || 'optician';
    
    if (isAuthLoaded && !isSignedIn && effectiveMode === "optician") {
      console.log(`[OpticianFormAuth/${instanceId.current}]: User not authenticated, redirecting to login`);
      
      // Prevent multiple redirects
      setIsRedirecting(true);
      
      // Store context for recovery
      saveAuthContext(token);
      
      // Redirect with replace to avoid history issues
      navigate("/sign-in", { replace: true });
    }
  }, [clerkAvailable, isAuthLoaded, isSignedIn, mode, navigate, isRedirecting, token, isInitializing]);

  // Check if returning from authentication
  useEffect(() => {
    // Skip if Clerk is not available, initialization is in progress, or navigation is in progress
    if (!clerkAvailable || isInitializing || navigationInProgressRef.current) return;
    
    // Only run if the user is now authenticated but we don't have a token in state
    if (isAuthLoaded && isSignedIn && !token) {
      const restored = restoreAuthContext(instanceId.current);
      
      if (restored && restored.token) {
        console.log(`[OpticianFormAuth/${instanceId.current}]: Restoring session with token: ${restored.token.substring(0, 6)}...`);
        
        // Notify parent component about token restoration
        onTokenRestore(restored.token, restored.mode);
        
        // Update URL to match token
        navigationInProgressRef.current = true;
        navigate(`/optician-form?token=${restored.token}&mode=${restored.mode}`, { replace: true });
        
        // Reset navigation flag after delay
        setTimeout(() => {
          navigationInProgressRef.current = false;
        }, 100);
      } else {
        // If we lost the token, navigate back to dashboard
        console.error(`[OpticianFormAuth/${instanceId.current}]: Failed to restore token, redirecting to dashboard`);
        navigate("/dashboard");
      }
    }
  }, [clerkAvailable, isAuthLoaded, isSignedIn, token, navigate, isInitializing, onTokenRestore]);

  return {
    isAuthLoaded,
    isSignedIn,
    isRedirecting
  };
};
