
/**
 * This component provides a dropdown for assigning or unassigning stores to anamnesis entries.
 * It displays a list of stores in the organization and allows authorized users to make assignments.
 * Enhanced with better error handling, retry logic, and user feedback for JWT authentication issues.
 */

import { useState } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Store, RefreshCw } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast'; 
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

interface StoreSelectorProps {
  currentStoreId: string | null;
  onAssignStore: (storeId: string | null) => Promise<void>;
  disabled?: boolean;
}

export function StoreSelector({
  currentStoreId,
  onAssignStore,
  disabled = false
}: StoreSelectorProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { stores, isLoading, refetch } = useStores();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { refreshClient } = useSupabaseClient();
  
  // Check if user has permission to assign stores - check organization roles
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
  
  // Validate UUID format
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  // Find the name of the currently assigned store if any
  const currentStore = stores.find(store => store.id === currentStoreId);
  const currentStoreLabel = currentStore?.name || 'Ingen butik tilldelad';
  
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
        description: "Listan med butiker har uppdaterats.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setHasError(true);
      
      toast({
        title: "Uppdateringsfel",
        description: "Kunde inte uppdatera listan med butiker. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  const handleStoreChange = async (value: string) => {
    if (disabled || !hasPermission) return;
    
    try {
      setIsPending(true);
      setHasError(false);
      
      // Handle "none" value to unassign
      if (value === 'none') {
        await onAssignStore(null);
        return;
      }
      
      // Validate UUID
      if (!isValidUUID(value)) {
        console.error('Invalid store ID format:', value);
        toast({
          title: "Fel vid tilldelning",
          description: "Ogiltigt format på butiks-ID",
          variant: "destructive",
        });
        return;
      }
      
      await onAssignStore(value);
    } catch (error: any) {
      console.error('Failed to assign store:', error);
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
          description: "Kunde inte tilldela butik",
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
        <Store className="h-4 w-4" />
        <span>Butik: {currentStoreLabel}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tilldela butik</label>
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
        value={currentStoreId || 'none'}
        onValueChange={handleStoreChange}
      >
        <SelectTrigger className={`w-full ${hasError ? 'border-destructive' : ''}`}>
          <SelectValue placeholder="Välj butik">
            {isPending ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tilldelar...
              </div>
            ) : (
              currentStoreLabel
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Ingen butik tilldelad</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
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
