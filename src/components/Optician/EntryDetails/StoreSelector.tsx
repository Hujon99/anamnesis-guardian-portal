
/**
 * This component provides a dropdown for assigning or unassigning stores to anamnesis entries.
 * It displays a list of stores in the organization and allows authorized users to make assignments.
 */

import { useState } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Store } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { stores, isLoading } = useStores();
  const [isPending, setIsPending] = useState(false);
  
  // Check if user has permission to assign stores - check organization roles
  const hasPermission = organization?.memberships?.data?.some(member => {
    return member.publicUserData?.userId === user?.id && 
      (member.role === 'admin' || member.role === 'org:admin');
  }) || false;
  
  // Find the name of the currently assigned store if any
  const currentStore = stores.find(store => store.id === currentStoreId);
  const currentStoreLabel = currentStore?.name || 'Ingen butik tilldelad';
  
  const handleStoreChange = async (value: string) => {
    if (disabled || !hasPermission) return;
    
    try {
      setIsPending(true);
      // Handle "none" value to unassign
      if (value === 'none') {
        await onAssignStore(null);
      } else {
        await onAssignStore(value);
      }
    } catch (error) {
      console.error('Failed to assign store:', error);
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
      <label className="text-sm font-medium">Tilldela butik</label>
      <Select
        disabled={disabled || isPending}
        value={currentStoreId || 'none'}
        onValueChange={handleStoreChange}
      >
        <SelectTrigger className="w-full">
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
    </div>
  );
}
