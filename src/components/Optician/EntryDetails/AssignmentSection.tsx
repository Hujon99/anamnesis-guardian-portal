
/**
 * This component provides a UI for managing assignments of opticians and stores to anamnesis entries.
 * It displays selectors for both opticians and stores and handles the assignment logic.
 */

import { OpticianSelector } from './OpticianSelector';
import { StoreSelector } from './StoreSelector';
import { Separator } from '@/components/ui/separator';
import { AnamnesesEntry } from '@/types/anamnesis';

interface AssignmentSectionProps {
  entry: AnamnesesEntry;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  onAssignStore: (storeId: string | null) => Promise<void>;
  isPending: boolean;
}

export function AssignmentSection({
  entry,
  onAssignOptician,
  onAssignStore,
  isPending
}: AssignmentSectionProps) {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Tilldelningar</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Här kan du tilldela optiker och butik till denna anamnes.
        </p>
      </div>
      
      <div className="space-y-4">
        <OpticianSelector 
          currentOpticianId={entry.optician_id || null}
          onAssignOptician={onAssignOptician}
          disabled={isPending}
        />
        
        <Separator className="my-4" />
        
        <StoreSelector 
          currentStoreId={entry.store_id || null}
          onAssignStore={onAssignStore}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
