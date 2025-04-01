
import { useState } from "react";
import { useOrganization } from "@clerk/clerk-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { OpticianHeader } from "@/components/Optician/OpticianHeader";
import { LinkGenerator } from "@/components/Optician/LinkGenerator";
import { TabsContainer } from "@/components/Optician/TabsContainer";
import { ContentContainer } from "@/components/Optician/ContentContainer";
import { AnamnesisProvider } from "@/contexts/AnamnesisContext";

const OpticianView = () => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncOrganization();
  const [error, setError] = useState<Error | null>(null);

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
    <AnamnesisProvider>
      <div className="container max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <OpticianHeader />
          <LinkGenerator />
        </div>
        
        <div className="grid md:grid-cols-12 gap-6 mt-6">
          <div className="md:col-span-5 lg:col-span-4">
            <TabsContainer />
          </div>
          
          <div className="md:col-span-7 lg:col-span-8">
            <ContentContainer />
          </div>
        </div>
      </div>
    </AnamnesisProvider>
  );
};

export default OpticianView;
