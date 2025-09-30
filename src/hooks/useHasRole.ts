/**
 * Hook to check if the current user has one or more specific roles.
 * Supports checking for multiple roles at once.
 */

import { useUserRole, UserRole } from './useUserRole';

export const useHasRole = (requiredRoles: UserRole | UserRole[]) => {
  const { role, isLoading } = useUserRole();

  const hasRole = () => {
    if (!role) return false;

    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(role);
    }

    return role === requiredRoles;
  };

  return {
    hasRole: hasRole(),
    isLoading,
    currentRole: role,
  };
};
