
/**
 * This component provides a UI for managing assignments of opticians and stores to anamnesis entries.
 * It displays selectors for both opticians and stores and handles the assignment logic.
 */

import { OpticianSelector } from './OpticianSelector';
import { StoreSelector } from './StoreSelector';
import { Separator } from '@/components/ui/separator';
import { IdVerificationQuickUpdate } from '../IdVerificationQuickUpdate';
import { AnamnesesEntry } from '@/types/anamnesis';

interface AssignmentSectionProps {
  entry: AnamnesesEntry;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  onAssignStore: (storeId: string | null) => Promise<void>;
  isPending: boolean;
  onEntryUpdate?: () => void;
}

export function AssignmentSection({
  entry,
  onAssignOptician,
  onAssignStore,
  isPending,
  onEntryUpdate
}: AssignmentSectionProps) {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Tilldelningar</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Här kan du tilldela optiker och butik till denna anamnes.
        </p>
      </div>
      
      {/* ID Verification Quick Update for entries awaiting verification */}
      {entry.status === 'pending_id_verification' && (
        <div className="space-y-4">
          <IdVerificationQuickUpdate
            entryId={entry.id}
            customerName={entry.first_name || 'Okänd kund'}
            onVerificationComplete={() => onEntryUpdate?.()}
          />
          <Separator className="my-4" />
        </div>
      )}
      
      <div className="space-y-4">
        <OpticianSelector 
          currentOpticianId={entry.optician_id || null}
          onAssignOptician={onAssignOptician}
          disabled={isPending}
        />
        
        <Separator className="my-4" />
        
        <StoreSelector 
          entryId={entry.id}
          storeId={entry.store_id || null}
          onStoreAssigned={onAssignStore}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
