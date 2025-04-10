
/**
 * This component displays the header section of the anamnesis detail modal,
 * including title, status badge, and action buttons.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AnamnesesEntry } from "@/types/anamnesis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  Copy, 
  Printer, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ModalHeaderProps {
  entry: AnamnesesEntry;
  isExpired: boolean;
  copyLinkToClipboard: () => void;
  handleSendLink: () => void;
  printForm: () => void;
  isSendingLink: boolean;
}

export function ModalHeader({ 
  entry, 
  isExpired, 
  copyLinkToClipboard, 
  handleSendLink,
  printForm,
  isSendingLink
}: ModalHeaderProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    copyLinkToClipboard();
    setHasCopied(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
    
    toast({
      title: "Länk kopierad",
      description: "Länken har kopierats till urklipp.",
    });
  };

  return (
    <DialogHeader className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <DialogTitle className="text-xl">
          {entry.patient_identifier || `Anamnes #${entry.id.substring(0, 8)}`}
        </DialogTitle>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={isExpired ? "destructive" : "outline"}
            className="flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            {isExpired 
              ? "Utgången" 
              : entry.expires_at 
                ? `Giltig till: ${format(new Date(entry.expires_at), "yyyy-MM-dd")}`
                : "Inget utgångsdatum"}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={printForm}
            title="Skriv ut"
            aria-label="Skriv ut anamnesen"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          Skapad: {entry.sent_at 
            ? format(new Date(entry.sent_at), "yyyy-MM-dd HH:mm") 
            : "Datum saknas"}
        </span>
      </div>
      
      {entry.access_token && (
        <div className="flex items-center gap-2 pt-1">
          <Button 
            variant={hasCopied ? "secondary" : "outline"}
            size="sm" 
            onClick={handleCopy}
            className="flex items-center gap-1 transition-all duration-300"
            aria-label="Kopiera anamneslänk"
          >
            {hasCopied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Kopierad
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Kopiera länk
              </>
            )}
          </Button>
        </div>
      )}
    </DialogHeader>
  );
}
