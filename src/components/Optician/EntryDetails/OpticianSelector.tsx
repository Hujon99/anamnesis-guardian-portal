
/**
 * This component provides a dropdown for assigning or unassigning opticians to anamnesis entries.
 * It displays a list of opticians in the organization and allows authorized users to make assignments.
 * Enhanced with better error handling, retry logic, and user feedback for JWT authentication issues.
 */

import { useState, useCallback } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, RefreshCw } from 'lucide-react';
import { useOpticians, Optician, getOpticianDisplayName, isValidUUID } from '@/hooks/useOpticians';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { Button } from '@/components/ui/button';

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
  const { opticians, isLoading, refetch } = useOpticians();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { refreshClient } = useSupabaseClient();
  
  // Check if user has permission to assign opticians - check organization roles
  const hasPermission = user && organization ? (async () => {
    try {
      const members = await organization.getMemberships();
      return members.data?.some(member => 
        member.publicUserData?.userId === user.id && 
        (member.role === 'admin' || member.role === 'org:admin')
      ) || false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  })() : false;
  
  // Log optician IDs to help debug
  if (opticians.length > 0) {
    console.log('Available opticians:', opticians.map(o => ({
      id: o.id,
      clerk_user_id: o.clerk_user_id,
      name: o.name,
      email: o.email
    })));
  }
  
  // Check if current optician ID is valid
  if (currentOpticianId && !isValidUUID(currentOpticianId)) {
    console.warn(`Current optician ID is not a valid UUID: ${currentOpticianId}`);
  }
  
  // Find the name of the currently assigned optician if any
  const currentOptician = opticians.find(opt => opt.id === currentOpticianId);
  const currentOpticianLabel = getOpticianDisplayName(currentOptician);
  
  // Handle refresh button click - force token refresh and refetch data
  const handleRefresh = async () => {
    try {
      setIsPending(true);
      setHasError(false);
      
      // Force a client refresh to get a new token
      await refreshClient(true);
      await refetch();
      
      toast({
        title: "Uppdaterad",
        description: "Listan med optiker har uppdaterats.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setHasError(true);
      
      toast({
        title: "Uppdateringsfel",
        description: "Kunde inte uppdatera listan med optiker. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  const handleOpticianChange = async (value: string) => {
    if (disabled || !hasPermission) return;
    
    try {
      setIsPending(true);
      setHasError(false);
      
      // Handle "none" value to unassign
      if (value === 'none') {
        await onAssignOptician(null);
        return;
      }
      
      // Validate UUID
      if (!isValidUUID(value)) {
        console.error('Invalid optician ID format:', value);
        toast({
          title: "Fel vid tilldelning",
          description: "Ogiltigt format på optiker-ID",
          variant: "destructive",
        });
        return;
      }
      
      console.log(`Assigning optician with ID: ${value}`);
      await onAssignOptician(value);
    } catch (error: any) {
      console.error('Failed to assign optician:', error);
      setHasError(true);
      
      // Check if it's a JWT error
      const isAuthError = error?.code === "PGRST301" || 
                         error?.message?.includes("JWT") || 
                         error?.message?.includes("401");
      
      if (isAuthError) {
        toast({
          title: "Sessionsfel",
          description: "Din session har upphört. Klicka på 'Uppdatera' för att förnya din session.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fel vid tilldelning",
          description: "Kunde inte tilldela optiker",
          variant: "destructive",
        });
      }
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tilldela optiker</label>
        {hasError && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Uppdatera
          </Button>
        )}
      </div>
      
      <Select
        disabled={disabled || isPending}
        value={currentOpticianId || 'none'}
        onValueChange={handleOpticianChange}
      >
        <SelectTrigger className={`w-full ${hasError ? 'border-destructive' : ''}`}>
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
              {getOpticianDisplayName(optician)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {hasError && (
        <p className="text-xs text-destructive mt-1">
          Det uppstod ett problem. Din session kan ha upphört. Prova att uppdatera eller ladda om sidan.
        </p>
      )}
    </div>
  );
}
