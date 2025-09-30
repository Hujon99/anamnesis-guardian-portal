/**
 * Simplified hook to check if the current user has admin privileges.
 * Useful for quick admin checks in components.
 */

import { useUserRole } from './useUserRole';

export const useIsAdmin = () => {
  const { isAdmin, isLoading } = useUserRole();
  
  return {
    isAdmin,
    isLoading,
  };
};
