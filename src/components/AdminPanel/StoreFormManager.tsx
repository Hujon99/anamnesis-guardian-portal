/**
 * Store Form Manager Component
 * Admin interface for managing which forms are available in which stores.
 * Allows bulk operations and individual form toggles per store.
 * Used in the AdminPanel's "Formulär per butik" tab.
 */

import React from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, FileText, Settings } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useOrganizationForms } from '@/hooks/useOrganizationForms';
import { useStoreFormAssignments } from '@/hooks/useStoreFormAssignments';

interface StoreFormCardProps {
  store: any;
  forms: any[];
  assignments: any[];
  onUpdateAssignment: (storeId: string, formId: string, isActive: boolean) => void;
  onBulkUpdate: (storeId: string, formIds: string[], isActive: boolean) => void;
  isUpdating: boolean;
}

const StoreFormCard: React.FC<StoreFormCardProps> = ({
  store,
  forms,
  assignments,
  onUpdateAssignment,
  onBulkUpdate,
  isUpdating
}) => {
  const storeAssignments = assignments.filter(a => a.store_id === store.id);
  
  const getFormStatus = (formId: string): boolean => {
    const assignment = storeAssignments.find(a => a.form_id === formId);
    return assignment ? assignment.is_active : true; // Default to active if no assignment
  };

  const activeFormsCount = forms.filter(form => getFormStatus(form.id)).length;
  const allFormIds = forms.map(form => form.id);

  const handleActivateAll = () => {
    onBulkUpdate(store.id, allFormIds, true);
  };

  const handleDeactivateAll = () => {
    onBulkUpdate(store.id, allFormIds, false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{store.name}</h3>
          </div>
          {store.address && (
            <p className="text-sm text-muted-foreground">{store.address}</p>
          )}
        </div>
        <Badge variant={activeFormsCount > 0 ? "default" : "secondary"} className="ml-2">
          {activeFormsCount}/{forms.length} aktiva
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleActivateAll}
          disabled={isUpdating || activeFormsCount === forms.length}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Aktivera alla
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeactivateAll}
          disabled={isUpdating || activeFormsCount === 0}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Inaktivera alla
        </Button>
      </div>

      <div className="space-y-3 border-t pt-4">
        {forms.map((form) => {
          const isActive = getFormStatus(form.id);
          return (
            <div key={form.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-light/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{form.title}</span>
                </div>
                {form.examination_type && (
                  <Badge variant="secondary" className="text-xs">
                    {form.examination_type}
                  </Badge>
                )}
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => 
                  onUpdateAssignment(store.id, form.id, checked)
                }
                disabled={isUpdating}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const StoreFormManager: React.FC = () => {
  const { organization } = useOrganization();
  const { stores, isLoading: isLoadingStores } = useStores();
  const { data: forms = [], isLoading: isLoadingForms } = useOrganizationForms();
  const { 
    assignments, 
    isLoading: isLoadingAssignments, 
    updateAssignment, 
    bulkUpdateAssignments, 
    isUpdating 
  } = useStoreFormAssignments(organization?.id);

  const isLoading = isLoadingStores || isLoadingForms || isLoadingAssignments;

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Du måste vara medlem i en organisation för att hantera formulär.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Laddar formulärtilldelningar...</p>
        </div>
      </div>
    );
  }

  if (!stores || stores.length === 0) {
    return (
      <div className="text-center py-12">
        <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Inga butiker</h3>
        <p className="text-muted-foreground">Skapa först en butik i fliken "Butiker" för att hantera formulär.</p>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Inga formulär</h3>
        <p className="text-muted-foreground">Det finns inga formulär att tilldela till butiker ännu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Formulär per butik
          </h2>
          <p className="text-muted-foreground mt-1">
            Hantera vilka formulär som ska vara tillgängliga i varje butik
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {stores.map((store) => (
          <StoreFormCard
            key={store.id}
            store={store}
            forms={forms}
            assignments={assignments}
            onUpdateAssignment={(storeId, formId, isActive) => 
              updateAssignment({ storeId, formId, isActive })
            }
            onBulkUpdate={(storeId, formIds, isActive) =>
              bulkUpdateAssignments({ storeId, formIds, isActive })
            }
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
};

export default StoreFormManager;