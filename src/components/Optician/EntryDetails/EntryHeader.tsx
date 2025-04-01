
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
  Calendar, 
  Clock, 
  Download, 
  FileText, 
  Printer, 
  Send 
} from "lucide-react";

interface EntryHeaderProps {
  entry: AnamnesesEntry;
  hasAnswers: boolean;
  isExpired: boolean;
  getSummary: () => string;
  printForm: () => void;
  exportToPDF: () => void;
}

export const EntryHeader = ({ 
  entry, 
  hasAnswers, 
  isExpired, 
  getSummary, 
  printForm, 
  exportToPDF 
}: EntryHeaderProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Utkast</Badge>;
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

  return (
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-xl">
            {entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}
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
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {getStatusBadge(entry.status || "")}
          
          {hasAnswers && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex gap-1" 
                onClick={printForm}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Skriv ut</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex gap-1" 
                onClick={exportToPDF}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportera</span>
              </Button>
            </div>
          )}
        </div>
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
};
