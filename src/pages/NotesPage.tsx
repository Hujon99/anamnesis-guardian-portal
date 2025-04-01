
import { useState } from "react";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { NoteForm } from "@/components/Dashboard/NoteForm";
import { NotesList } from "@/components/Dashboard/NotesList";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { ErrorAlert } from "@/components/Dashboard/ErrorAlert";
import { FileText } from "lucide-react";

const NotesPage = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [retryCount, setRetryCount] = useState(0);
  const { supabase, isLoading: supabaseLoading, error: supabaseError } = useSupabaseClient();
  const { isSyncing, isSynced, error: syncError } = useSyncOrganization();
  const [notesError, setNotesError] = useState<Error | null>(null);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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

  const showRetryButton = (supabaseError || syncError || notesError) && !isSyncing;

  return (
    <div className="max-w-6xl mx-auto">
      <DashboardHeader 
        showRetryButton={showRetryButton} 
        onRetry={handleRetry} 
      />

      <ErrorAlert 
        supabaseError={supabaseError}
        syncError={syncError}
        notesError={notesError}
        isSyncing={isSyncing}
      />

      <div className="grid md:grid-cols-2 gap-8">
        <NoteForm />

        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dina anteckningar
          </h2>
          
          <NotesList 
            retryCount={retryCount} 
            onRetry={handleRetry} 
          />
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
