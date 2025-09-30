/**
 * Context for managing system administrator authentication.
 * This provides a separate authentication layer outside of Clerk
 * for accessing global system settings and templates.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SystemAdminContextType {
  isSystemAdmin: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const SystemAdminContext = createContext<SystemAdminContextType | undefined>(undefined);

const STORAGE_KEY = 'system_admin_auth';

export const SystemAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated as system admin
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setIsSystemAdmin(true);
    }
  }, []);

  const login = async (token: string): Promise<boolean> => {
    try {
      // Verify token with backend
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co"}/functions/v1/verify-system-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsSystemAdmin(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('System admin login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsSystemAdmin(false);
  };

  return (
    <SystemAdminContext.Provider value={{ isSystemAdmin, login, logout }}>
      {children}
    </SystemAdminContext.Provider>
  );
};

export const useSystemAdmin = () => {
  const context = useContext(SystemAdminContext);
  if (context === undefined) {
    throw new Error('useSystemAdmin must be used within a SystemAdminProvider');
  }
  return context;
};
