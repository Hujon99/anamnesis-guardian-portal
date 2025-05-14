
/**
 * This component displays a list of test notes with their details.
 * It fetches notes data from Supabase and shows them in a card layout.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Store, User } from "lucide-react";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSyncOrganization } from "@/hooks/useSyncOrganization";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

type TestNote = Tables<"test_notes">;
type StoreData = Tables<"stores">;

interface NotesListProps {
  retryCount: number;
  onRetry: () => void;
}

export const NotesList = ({ retryCount, onRetry }: NotesListProps) => {
  const { organization } = useOrganization();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncOrganization();
  const queryClient = useQueryClient();

  // Fetch notes
  const { data: notes = [], isLoading: notesLoading, error, refetch } = useQuery({
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
  
  // Fetch stores to show store names instead of IDs
  const { data: stores = [] } = useQuery({
    queryKey: ["stores", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', organization.id);
        
      if (error) throw error;
      return data as StoreData[];
    },
    enabled: !!organization?.id && isSynced
  });
  
  // Create a map of store IDs to store names for quick lookup
  const storeMap = new Map<string, string>();
  stores.forEach(store => {
    storeMap.set(store.id, store.name);
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

  if (notesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">Det gick inte att hämta anteckningar</p>
          <Button onClick={() => onRetry()} variant="outline">
            Försök igen
          </Button>
        </CardContent>
      </Card>
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
        <Card key={note.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{note.title || "Onamngiven anteckning"}</CardTitle>
                <CardDescription>
                  Skapad: {new Date(note.created_at).toLocaleDateString('sv-SE')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-primary/5 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{note.user_id || "Okänd användare"}</span>
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{note.content}</p>
            
            {/* Display organization information */}
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Organisation: {organization?.name || note.organization_id}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
