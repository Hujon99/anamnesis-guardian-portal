
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AnamnesesEntry } from "@/pages/OpticianView";
import { formatDate } from "@/lib/date-utils";

interface EntriesListProps {
  status: string;
  selectedEntry: AnamnesesEntry | null;
  onSelectEntry: (entry: AnamnesesEntry) => void;
}

export const EntriesList = ({ status, selectedEntry, onSelectEntry }: EntriesListProps) => {
  const { organization } = useOrganization();
  const { supabase } = useSupabaseClient();

  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ["anamnes-entries", organization?.id, status],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("anamnes_entries")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching anamnes entries:", error);
        toast({
          title: "Fel vid hämtning av anamneser",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return data as AnamnesesEntry[];
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
        <p>Ett fel uppstod: {error.message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2" 
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Försök igen
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {status === "pending" ? 
              "Inga anamneser att granska" : 
              "Inga färdiga anamneser"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card 
          key={entry.id} 
          className={`cursor-pointer transition-all hover:shadow ${
            selectedEntry?.id === entry.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onSelectEntry(entry)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Anamnes #{entry.id.substring(0, 8)}</p>
                <p className="text-sm text-muted-foreground">
                  Skapad: {formatDate(entry.created_at)}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
