
/**
 * Administrationspanel för organisationsadministratörer.
 * Innehåller gränssnitt för hantering av butiker, formulär och organisationsinställningar.
 * Endast användare med administratörsroll har tillgång till denna sida.
 */

import { useState } from "react";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Building2, AlertTriangle, Settings, Plus, FileText, Bug, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useStores } from "@/hooks/useStores";
import { Tables } from "@/integrations/supabase/types";
import { StoreCard } from "@/components/AdminPanel/StoreCard";
import { StoreForm } from "@/components/AdminPanel/StoreForm";
import { ConfirmDeleteDialog } from "@/components/AdminPanel/ConfirmDeleteDialog";
import { OrganizationSettings } from "@/components/AdminPanel/OrganizationSettings";
import { SystemSettings } from "@/components/AdminPanel/SystemSettings";
import { FormManagementGrid } from "@/components/FormBuilder/FormManagementGrid";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";
import { FormSessionDebugView } from "@/components/AdminPanel/FormSessionDebugView";
import { UpgradeStatsCards } from "@/components/AdminPanel/UpgradeStatsCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Store = Tables<"stores">;

const AdminPanel = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { isSystemAdmin } = useSystemAdmin();
  const [activeTab, setActiveTab] = useState("stores");
  const { error: supabaseError } = useSupabaseClient();
  const [statsTimeRange, setStatsTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  
  // Store management state
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);
  const [isDeletingStore, setIsDeletingStore] = useState(false);

  // Fetch stores using the existing hook
  const { 
    stores = [], 
    isLoading: storesLoading, 
    error: storesError,
    forceRefreshStores,
    createStore,
    updateStore
  } = useStores();

  const { supabase } = useSupabaseClient();

  const handleCreateStore = () => {
    setEditingStore(null);
    setShowStoreForm(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setShowStoreForm(true);
  };

  const handleDeleteStore = (store: Store) => {
    setDeletingStore(store);
    setShowDeleteDialog(true);
  };

  const confirmDeleteStore = async () => {
    if (!deletingStore || !supabase) return;
    
    setIsDeletingStore(true);
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', deletingStore.id);

      if (error) throw error;
      
      // Refresh the stores list
      await forceRefreshStores();
      
      toast({
        title: "Butik borttagen",
        description: "Butiken har tagits bort framgångsrikt",
      });
      
      setShowDeleteDialog(false);
      setDeletingStore(null);
    } catch (error) {
      toast({
        title: "Fel uppstod",
        description: "Kunde inte ta bort butiken",
        variant: "destructive",
      });
    } finally {
      setIsDeletingStore(false);
    }
  };

  if (!organization) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Du måste tillhöra en organisation</h2>
        <p className="text-gray-600 mb-6">
          Kontakta din administratör för att bli tillagd i en organisation.
        </p>
      </div>
    );
  }

  return (
    <ProtectedRoute requireRole="admin">
      <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground">
            Organisation: {organization?.name}
          </p>
        </div>
        
        <Button onClick={handleCreateStore} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Lägg till butik
        </Button>
      </div>

      {supabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fel vid anslutning till Supabase</AlertTitle>
          <AlertDescription>
            {typeof supabaseError === 'string' ? supabaseError : supabaseError}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="stores" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Butiker
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Formulär
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Inställningar
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Statistik
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Felsökning
          </TabsTrigger>
          {isSystemAdmin && (
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="stores" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Butiker
              </CardTitle>
              <CardDescription>
                Hantera butiker i din organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-2xl p-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : storesError ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Fel vid hämtning av butiker</p>
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Inga butiker hittades</p>
                  <Button onClick={handleCreateStore}>
                    Skapa första butiken
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {stores.map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      onEdit={handleEditStore}
                      onDelete={handleDeleteStore}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forms" className="mt-0">
          <FormManagementGrid />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0">
          <OrganizationSettings />
        </TabsContent>
        
        <TabsContent value="statistics" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Uppgraderingsstatistik
                  </CardTitle>
                  <CardDescription>
                    Spårning av accepterade uppgraderingar till ögonhälsoundersökning
                  </CardDescription>
                </div>
                <Select value={statsTimeRange} onValueChange={(value: any) => setStatsTimeRange(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Välj tidsperiod" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Senaste veckan</SelectItem>
                    <SelectItem value="month">Senaste månaden</SelectItem>
                    <SelectItem value="year">Senaste året</SelectItem>
                    <SelectItem value="all">Sedan start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <UpgradeStatsCards timeRange={statsTimeRange} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug" className="mt-0">
          <FormSessionDebugView />
        </TabsContent>
        
        {isSystemAdmin && (
          <TabsContent value="system" className="mt-0">
            <SystemSettings />
          </TabsContent>
        )}
      </Tabs>

      {/* Store Form Dialog */}
      <StoreForm
        open={showStoreForm}
        onOpenChange={setShowStoreForm}
        store={editingStore}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        store={deletingStore}
        onConfirm={confirmDeleteStore}
        isDeleting={isDeletingStore}
      />
      </div>
    </ProtectedRoute>
  );
};

export default AdminPanel;
