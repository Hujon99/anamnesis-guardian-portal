
import { useState } from "react";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PlusCircle, FileText, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Tables } from "@/integrations/supabase/types";

type TestNote = Tables<"test_notes">;

const Dashboard = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const { supabase, isLoading: supabaseLoading, error: supabaseError } = useSupabaseClient();

  // Query to fetch test notes
  const { data: notes = [], isLoading, error: notesError } = useQuery({
    queryKey: ["testNotes"],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("test_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        toast({
          title: "Fel vid hämtning av anteckningar",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return data as TestNote[];
    },
    enabled: !!user && !!organization && !supabaseLoading,
  });

  // Mutation to create a new test note
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("Ingen organisation vald");
      }
      
      if (!title.trim() || !content.trim()) {
        throw new Error("Titel och innehåll krävs");
      }

      const { data, error } = await supabase
        .from("test_notes")
        .insert([
          {
            title,
            content,
            user_id: user?.id || "",
            organization_id: organization?.id,
          },
        ])
        .select();

      if (error) {
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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Organisation: {organization?.name}
          </p>
        </div>
      </div>

      {supabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fel vid anslutning till Supabase</AlertTitle>
          <AlertDescription>
            {supabaseError.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8">
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
                  disabled={supabaseLoading}
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
                  disabled={supabaseLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={createNoteMutation.isPending || supabaseLoading}
              >
                {createNoteMutation.isPending ? "Sparar..." : "Spara anteckning"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dina anteckningar
          </h2>
          
          {supabaseLoading ? (
            <div className="text-center py-8">Laddar anteckningar...</div>
          ) : isLoading ? (
            <div className="text-center py-8">Laddar anteckningar...</div>
          ) : notes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Du har inga anteckningar än</p>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
