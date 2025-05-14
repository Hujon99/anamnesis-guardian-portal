
/**
 * This component renders the appropriate action buttons based on the entry's status.
 * It displays different buttons for different stages in the workflow.
 */

import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  ClipboardList, 
  Clock, 
  Loader2, 
  ArrowLeft, 
  Star,
  FileText 
} from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface ModalActionsProps {
  status: string;
  hasAnswers: boolean;
  isPending: boolean;
  onUpdateStatus: (newStatus: string) => void;
  entryToken?: string;
  onCloseModal?: () => void;
}

export function ModalActions({ 
  status, 
  hasAnswers, 
  isPending, 
  onUpdateStatus,
  entryToken,
  onCloseModal
}: ModalActionsProps) {
  const navigate = useNavigate();

  // Handler for navigating to the optician form filling page
  const handleFillOutForm = () => {
    if (entryToken && onCloseModal) {
      onCloseModal(); // Close the modal first
      navigate(`/optician-form?token=${entryToken}&mode=optician`);
    }
  };

  return (
    <DialogFooter className="mt-6 border-t pt-4">
      {status === "sent" && (
        <div className="w-full flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => onUpdateStatus("pending")}
            variant="outline"
            disabled={!hasAnswers || isPending}
            className="flex-1"
            aria-label={hasAnswers ? "Börja granska anamnesen" : "Väntar på patientens svar"}
          >
            {hasAnswers ? (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                Börja granska
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Väntar på patientens svar
              </>
            )}
          </Button>
          
          {!hasAnswers && entryToken && (
            <Button 
              onClick={handleFillOutForm}
              variant="default"
              disabled={isPending}
              className="flex-1"
              aria-label="Fyll i formuläret själv"
            >
              <FileText className="h-4 w-4 mr-2" />
              Fyll i formuläret själv
            </Button>
          )}
        </div>
      )}
      
      {status === "pending" && (
        <Button 
          onClick={() => onUpdateStatus("ready")}
          disabled={isPending}
          className="w-full"
          aria-label="Markera som klar för undersökning"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Markera som klar för undersökning
        </Button>
      )}
      
      {status === "ready" && (
        <>
          <Button 
            onClick={() => onUpdateStatus("journaled")}
            disabled={isPending}
            className="flex-1"
            aria-label="Markera som journalförd"
          >
            <Star className="h-4 w-4 mr-2" />
            Markera som journalförd
          </Button>
          
          <Button 
            onClick={() => onUpdateStatus("pending")}
            variant="outline"
            disabled={isPending}
            className="flex-1"
            aria-label="Markera som ej granskad"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Markera som ej granskad
          </Button>
        </>
      )}
      
      {(status === "journaled" || status === "reviewed") && (
        <Button 
          onClick={() => onUpdateStatus("ready")}
          variant="outline"
          disabled={isPending}
          className="w-full"
          aria-label="Återställ till 'Klar för undersökning'"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Återställ till "Klar för undersökning"
        </Button>
      )}
    </DialogFooter>
  );
}
