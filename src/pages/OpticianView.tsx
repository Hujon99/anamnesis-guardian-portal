
import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { EntriesList } from "@/components/Optician/EntriesList";
import { EntryDetails } from "@/components/Optician/EntryDetails";
import { OpticianHeader } from "@/components/Optician/OpticianHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

export type AnamnesesEntry = Tables<"anamnes_entries">;

const OpticianView = () => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncOrganization();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset selected entry when changing tabs
  useEffect(() => {
    setSelectedEntry(null);
  }, [activeTab]);

  const isReady = !supabaseLoading && !isSyncing && isSynced;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel</AlertTitle>
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto">
      <OpticianHeader />
      
      <div className="grid md:grid-cols-12 gap-6 mt-6">
        <div className="md:col-span-5 lg:col-span-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Att granska</TabsTrigger>
              <TabsTrigger value="ready">Klara</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-4">
              <EntriesList 
                status="pending" 
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
              />
            </TabsContent>
            
            <TabsContent value="ready" className="mt-4">
              <EntriesList 
                status="ready" 
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="md:col-span-7 lg:col-span-8">
          {selectedEntry ? (
            <EntryDetails 
              entry={selectedEntry} 
              onEntryUpdated={() => setSelectedEntry(null)} 
            />
          ) : (
            <div className="border rounded-lg p-6 text-center h-full flex items-center justify-center">
              <p className="text-muted-foreground">
                Välj en anamnes från listan för att se detaljer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpticianView;
