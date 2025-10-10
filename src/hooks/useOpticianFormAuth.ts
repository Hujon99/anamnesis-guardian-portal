
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
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigationInProgressRef = useRef<boolean>(false);
  const instanceId = useRef(`auth-${Math.random().toString(36).substring(2, 7)}`);
  
  // Determine mode early
  const effectiveMode = mode || 'patient';
  const isPatientMode = effectiveMode === 'patient';
  
  // Only use Clerk hooks if Clerk is available and we're in optician mode
  // IMPORTANT: Always call this hook (Rules of Hooks) but don't use it for patient mode
  const authResult = clerkAvailable && !isPatientMode ? useAuth() : { isLoaded: true, isSignedIn: false };
  const { isLoaded: isAuthLoaded, isSignedIn } = authResult;

  // Handle non-authenticated users for optician mode
  useEffect(() => {
    // Skip for patient mode - token gives access
    if (isPatientMode) return;
    
    // Skip if Clerk is not available or initialization is in progress
    if (!clerkAvailable || isInitializing || isRedirecting) return;
    
    if (isAuthLoaded && !isSignedIn && effectiveMode === "optician") {
      console.log(`[OpticianFormAuth/${instanceId.current}]: User not authenticated, redirecting to login`);
      
      // Prevent multiple redirects
      setIsRedirecting(true);
      
      // Store context for recovery
      saveAuthContext(token);
      
      // Redirect with replace to avoid history issues
      navigate("/sign-in", { replace: true });
    }
  }, [isPatientMode, clerkAvailable, isAuthLoaded, isSignedIn, effectiveMode, navigate, isRedirecting, token, isInitializing]);

  // Check if returning from authentication
  useEffect(() => {
    // Skip for patient mode - token gives access
    if (isPatientMode) return;
    
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
  }, [isPatientMode, clerkAvailable, isAuthLoaded, isSignedIn, token, navigate, isInitializing, onTokenRestore]);

  // For patient mode, return that we're always "authenticated" (token gives access)
  if (isPatientMode) {
    return {
      isAuthLoaded: true,
      isSignedIn: true,
      isRedirecting: false
    };
  }
  
  // For optician mode, return actual Clerk auth state
  return {
    isAuthLoaded,
    isSignedIn,
    isRedirecting
  };
};
