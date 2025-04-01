
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";

type TestNote = Tables<"test_notes">;

interface NotesListProps {
  retryCount: number;
  onRetry: () => void;
}

export const NotesList = ({ retryCount, onRetry }: NotesListProps) => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncOrganization();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["testNotes", organization?.id, isSynced, retryCount],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      if (!isSynced) {
        console.log("Organization not synced yet, delaying notes fetch");
        return [];
      }
      
      console.log("Fetching notes for organization:", organization.id);
      
      const { data, error } = await supabase
        .from("test_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        throw error;
      }

      return data as TestNote[];
    },
    enabled: !!organization?.id && !supabaseLoading && isSynced,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
    meta: {
      errorHandler: (error: any) => {
        toast({
          title: "Fel vid hämtning av anteckningar",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  useEffect(() => {
    if (isSynced && organization?.id) {
      refetch();
    }
  }, [isSynced, organization?.id, refetch]);

  if ((supabaseLoading || isSyncing)) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Laddar anteckningar...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Laddar anteckningar...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Du har inga anteckningar än</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id}>
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
            <CardDescription>
              Skapad: {new Date(note.created_at).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{note.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
