
/**
 * This component renders a form for creating new test notes.
 * It handles form submission, validation, and provides feedback to the user.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PlusCircle } from "lucide-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useSyncOrganizationStore } from "@/hooks/useSyncOrganizationStore";

// Helper hook to expose sync status from component scope
const useSyncStatus = () => {
  const { organization } = useOrganization();
  const syncInfo = useSyncOrganizationStore(state => ({
    isSynced: state.syncedOrgs[organization?.id || ""] || false,
    isSyncing: state.syncingOrgs[organization?.id || ""] || false
  }));
  
  return syncInfo;
};

export const NoteForm = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { organization } = useOrganization();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { supabase, isLoading: supabaseLoading } = useSupabaseClient();
  const { isSyncing, isSynced } = useSyncStatus();
  
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("Ingen organisation vald");
      }
      
      if (!title.trim() || !content.trim()) {
        throw new Error("Titel och innehåll krävs");
      }
      
      if (!user?.id) {
        throw new Error("Användar-ID saknas");
      }
      
      const { data, error } = await supabase
        .from("test_notes")
        .insert([
          {
            title,
            content,
            user_id: user.id,
            organization_id: organization.id,
          },
        ])
        .select();

      if (error) {
        console.error("Error creating note:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Anteckning skapad",
        description: "Din anteckning har sparats.",
      });
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["testNotes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fel vid skapande av anteckning",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNoteMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Skapa ny anteckning
        </CardTitle>
        <CardDescription>
          Lägg till en ny testanteckning för din organisation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Titel
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anteckningens titel"
              required
              disabled={supabaseLoading || isSyncing || createNoteMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Innehåll
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv innehållet här..."
              rows={5}
              required
              disabled={supabaseLoading || isSyncing || createNoteMutation.isPending}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={createNoteMutation.isPending || supabaseLoading || isSyncing || !isSynced}
          >
            {createNoteMutation.isPending ? "Sparar..." : "Spara anteckning"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
