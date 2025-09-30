/**
 * Component for role-based UI rendering.
 * Shows children only if the user has one of the required roles.
 * Optionally renders a fallback component if access is denied.
 */

import { useHasRole } from '@/hooks/useHasRole';
import { UserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole | UserRole[];
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

export const RoleGuard = ({ 
  children, 
  roles, 
  fallback = null,
  showLoading = false 
}: RoleGuardProps) => {
  const { hasRole, isLoading } = useHasRole(roles);

  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return null;
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
