
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, RefreshCw, Clock, CheckCircle, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";

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
        .eq("organization_id", organization.id)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
      case "sent":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string, entry: AnamnesesEntry) => {
    const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
    
    if (isExpired) {
      return <Badge variant="destructive">Utgången</Badge>;
    }
    
    switch (status) {
      case "draft":
        return <Badge variant="outline">Utkast</Badge>;
      case "sent":
        return <Badge variant="secondary">Skickad</Badge>;
      case "pending":
        return <Badge variant="warning">Väntar på granskning</Badge>;
      case "ready":
        return <Badge variant="success">Klar för undersökning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            {status === "draft" ? "Inga utkast" : 
             status === "sent" ? "Inga skickade anamneser" :
             status === "pending" ? "Inga anamneser att granska" : 
             "Inga färdiga anamneser"}
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
                <div className="flex items-center gap-1">
                  {getStatusIcon(entry.status || "")}
                  <p className="font-medium">{entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-muted-foreground">
                    {entry.sent_at 
                      ? `Skickad: ${formatDate(entry.sent_at)}` 
                      : `Skapad: ${formatDate(entry.created_at || "")}`}
                  </p>
                  {getStatusLabel(entry.status || "", entry)}
                </div>
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
