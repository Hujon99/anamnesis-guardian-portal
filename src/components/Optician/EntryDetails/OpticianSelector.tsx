
/**
 * This component provides a dropdown for assigning or unassigning opticians to anamnesis entries.
 * It displays a list of opticians in the organization and allows authorized users to make assignments.
 */

import { useState } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, User } from 'lucide-react';
import { useOpticians } from '@/hooks/useOpticians';
import { Skeleton } from '@/components/ui/skeleton';

interface OpticianSelectorProps {
  currentOpticianId: string | null;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  disabled?: boolean;
}

export function OpticianSelector({
  currentOpticianId,
  onAssignOptician,
  disabled = false
}: OpticianSelectorProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { opticians, isLoading } = useOpticians();
  const [isPending, setIsPending] = useState(false);
  
  // Check if user has permission to assign opticians - check organization roles
  const hasPermission = organization?.membershipList?.some(member => {
    return member.publicUserData?.userId === user?.id && 
      (member.role === 'admin' || member.role === 'org:admin');
  }) || false;
  
  // Find the name of the currently assigned optician if any
  const currentOptician = opticians.find(opt => opt.id === currentOpticianId);
  const currentOpticianLabel = currentOptician?.name || currentOptician?.email || 'Ingen optiker tilldelad';
  
  const handleOpticianChange = async (value: string) => {
    if (disabled || !hasPermission) return;
    
    try {
      setIsPending(true);
      // Handle "none" value to unassign
      if (value === 'none') {
        await onAssignOptician(null);
      } else {
        await onAssignOptician(value);
      }
    } catch (error) {
      console.error('Failed to assign optician:', error);
    } finally {
      setIsPending(false);
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }
  
  if (!hasPermission) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Optiker: {currentOpticianLabel}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tilldela optiker</label>
      <Select
        disabled={disabled || isPending}
        value={currentOpticianId || 'none'}
        onValueChange={handleOpticianChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Välj optiker">
            {isPending ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tilldelar...
              </div>
            ) : (
              currentOpticianLabel
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Ingen optiker tilldelad</SelectItem>
          {opticians.map((optician) => (
            <SelectItem key={optician.id} value={optician.id}>
              {optician.name || optician.email || 'Okänd optiker'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
