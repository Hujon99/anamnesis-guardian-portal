
/**
 * This component renders the header section of an anamnesis entry detail view.
 * It displays entry metadata, status, and action buttons for printing and exporting.
 * It also includes a summary of patient answers when available.
 */

import { AnamnesesEntry } from "@/types/anamnesis";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar, 
  Clock, 
  Copy, 
  Download, 
  FileText, 
  Link, 
  Printer, 
  Send,
  User 
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BookingInfoPanel } from "./BookingInfoPanel";

interface EntryHeaderProps {
  entry: AnamnesesEntry;
  hasAnswers: boolean;
  isExpired: boolean;
  getSummary: () => string;
}

export function EntryHeader({ 
  entry, 
  hasAnswers, 
  isExpired, 
  getSummary 
}: EntryHeaderProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="secondary">Skickad till patient</Badge>;
      case "pending":
        return <Badge variant="warning">Väntar på granskning</Badge>;
      case "ready":
        return <Badge variant="success">Klar för undersökning</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500 text-white">Granskad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get the appropriate display title
  const getDisplayTitle = () => {
    if (entry.first_name) {
      return `Anamnes för ${entry.first_name}`;
    } else if (entry.patient_identifier) {
      return entry.patient_identifier;
    } else {
      return `Anamnes #${entry.id.substring(0, 8)}`;
    }
  };

  const copyPatientLink = () => {
    if (!entry.access_token) {
      toast({
        title: "Ingen åtkomstlänk",
        description: "Det finns ingen giltig åtkomstlänk för denna anamnes.",
        variant: "destructive",
      });
      return;
    }

    const baseUrl = window.location.origin;
    const patientLink = `${baseUrl}/patient-form?token=${entry.access_token}`;
    
    console.log("Copying patient link to clipboard:", patientLink);
    
    navigator.clipboard.writeText(patientLink)
      .then(() => {
        toast({
          title: "Länk kopierad",
          description: "Patientlänken har kopierats till urklipp.",
        });
      })
      .catch((error) => {
        console.error("Error copying link:", error);
        toast({
          title: "Kunde inte kopiera",
          description: "Det gick inte att kopiera länken. Försök igen.",
          variant: "destructive",
        });
      });
  };

  return (
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-xl">
            {getDisplayTitle()}
          </CardTitle>
          <CardDescription className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Skapad: {formatDate(entry.created_at || "")}</span>
            </div>
            {entry.sent_at && (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span>Skickad: {formatDate(entry.sent_at)}</span>
              </div>
            )}
            {entry.expires_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={isExpired ? "text-destructive" : ""}>
                  Giltig till: {formatDate(entry.expires_at)}
                  {isExpired && " (Utgången)"}
                </span>
              </div>
            )}
            {entry.created_by_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Ansvarig optiker: {entry.created_by_name}</span>
              </div>
            )}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {getStatusBadge(entry.status || "")}
        </div>
      </div>
      
      {/* Booking Info Panel - new component */}
      <BookingInfoPanel entry={entry} />
      
      {/* Patient link section - now always visible */}
      <div className="mt-4 border p-3 rounded-md bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Patientlänk</span>
          </div>
          <Button 
            onClick={copyPatientLink}
            variant="default"
            size="sm"
            className="flex gap-1"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Kopiera länk</span>
          </Button>
        </div>
        {entry.access_token && (
          <div className="mt-2 text-xs text-muted-foreground truncate">
            {window.location.origin}/patient-form?token={entry.access_token}
          </div>
        )}
      </div>
      
      {hasAnswers && (
        <div className="mt-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Sammanfattning</AlertTitle>
            <AlertDescription>
              {getSummary()}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </CardHeader>
  );
}
