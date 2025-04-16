
/**
 * This component displays the header section of the anamnesis detail modal,
 * including title, status badge, and action buttons with improved layout.
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
  CheckCircle2, 
  User, 
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { DeleteAnamnesisConfirmation } from "./DeleteAnamnesisConfirmation";

interface ModalHeaderProps {
  entry: AnamnesesEntry;
  isExpired: boolean;
  copyLinkToClipboard: () => void;
  handleSendLink: () => void;
  isSendingLink: boolean;
  onDelete?: () => void;
}

export function ModalHeader({
  entry,
  isExpired,
  copyLinkToClipboard,
  handleSendLink,
  isSendingLink,
  onDelete
}: ModalHeaderProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const handleCopy = () => {
    copyLinkToClipboard();
    setHasCopied(true);

    // Reset after 2 seconds
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };
  
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirmation(false);
  };
  
  return (
    <DialogHeader className="relative space-y-3 pb-2 pr-10">
      <div className="flex items-center justify-between">
        <DialogTitle className="text-xl truncate max-w-[70%]">
          {entry.patient_identifier || `Anamnes #${entry.id.substring(0, 8)}`}
        </DialogTitle>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={isExpired ? "destructive" : "outline"} 
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Clock className="h-3 w-3" />
            {isExpired ? "Utgången" : entry.expires_at ? `Giltig till: ${format(new Date(entry.expires_at), "yyyy-MM-dd")}` : "Inget utgångsdatum"}
          </Badge>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>
            Skapad: {entry.sent_at ? format(new Date(entry.sent_at), "yyyy-MM-dd HH:mm") : "Datum saknas"}
          </span>
        </div>
        
        {entry.created_by_name && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>Ansvarig optiker: {entry.created_by_name}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 pt-1">
        {entry.access_token && (
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
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeleteClick}
          className="flex items-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Ta bort anamnes"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Ta bort
        </Button>
      </div>
      
      {showDeleteConfirmation && (
        <DeleteAnamnesisConfirmation
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={handleConfirmDelete}
          patientName={entry.patient_identifier || `Anamnes #${entry.id.substring(0, 8)}`}
        />
      )}
    </DialogHeader>
  );
}
