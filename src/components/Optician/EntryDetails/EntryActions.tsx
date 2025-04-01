
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Clock, ClipboardList, Loader2, Send, Star } from "lucide-react";

interface EntryActionsProps {
  status: string;
  hasAnswers: boolean;
  patientEmail: string | null;
  updateStatus: (newStatus: string) => void;
  sendLink: () => void;
  isPending: boolean;
  isSendingLink: boolean;
}

export const EntryActions = ({
  status,
  hasAnswers,
  patientEmail,
  updateStatus,
  sendLink,
  isPending,
  isSendingLink
}: EntryActionsProps) => {
  return (
    <CardFooter className="border-t pt-4 flex justify-between gap-2 flex-wrap">
      {status === "pending" && (
        <Button 
          onClick={() => updateStatus("ready")}
          disabled={isPending}
          className="w-full sm:w-auto flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Markera som klar för undersökning
        </Button>
      )}
      
      {status === "ready" && (
        <>
          <Button 
            onClick={() => updateStatus("reviewed")}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            <Star className="h-4 w-4 mr-2" />
            Markera som granskad
          </Button>
          
          <Button 
            onClick={() => updateStatus("pending")}
            variant="outline"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Markera som ej granskad
          </Button>
        </>
      )}
      
      {status === "reviewed" && (
        <Button 
          onClick={() => updateStatus("ready")}
          variant="outline"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Återställ till "Klar för undersökning"
        </Button>
      )}
      
      {status === "sent" && (
        <Button 
          onClick={() => updateStatus("pending")}
          variant="outline"
          disabled={!hasAnswers || isPending}
          className="w-full"
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
    </CardFooter>
  );
};
