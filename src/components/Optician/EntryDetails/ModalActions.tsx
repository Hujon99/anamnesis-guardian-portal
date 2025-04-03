
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
  Star 
} from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

interface ModalActionsProps {
  status: string;
  hasAnswers: boolean;
  isPending: boolean;
  onUpdateStatus: (newStatus: string) => void;
}

export function ModalActions({ 
  status, 
  hasAnswers, 
  isPending, 
  onUpdateStatus 
}: ModalActionsProps) {
  return (
    <DialogFooter className="mt-6 border-t pt-4">
      {status === "sent" && (
        <Button 
          onClick={() => onUpdateStatus("pending")}
          variant="outline"
          disabled={!hasAnswers || isPending}
          className="w-full"
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
            onClick={() => onUpdateStatus("reviewed")}
            disabled={isPending}
            className="flex-1"
            aria-label="Markera som granskad"
          >
            <Star className="h-4 w-4 mr-2" />
            Markera som granskad
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
      
      {status === "reviewed" && (
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
