
/**
 * This component provides a confirmation dialog for deleting anamnesis entries.
 * It ensures users don't accidentally delete important patient data by requiring
 * explicit confirmation before proceeding with deletion.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteAnamnesisConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patientName: string;
}

export function DeleteAnamnesisConfirmation({
  isOpen,
  onClose,
  onConfirm,
  patientName
}: DeleteAnamnesisConfirmationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Ta bort anamnes</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Är du säker på att du vill ta bort anamnesdata för <strong>{patientName}</strong>? 
            Detta kan inte ångras och all information kommer att försvinna permanent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
