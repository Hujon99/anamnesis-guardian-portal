/**
 * Dialog component that asks if the customer attempted to fill the form online.
 * This helps track failed submission attempts for debugging and analytics.
 * Part of the direct form creation flow in the optician interface.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";

interface FormAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { attempted: boolean; description?: string }) => void;
}

const FormAttemptDialog: React.FC<FormAttemptDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [attempted, setAttempted] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");

  const handleConfirm = () => {
    if (attempted === null) return;
    
    onConfirm({
      attempted,
      description: attempted && description.trim() ? description.trim() : undefined,
    });
    
    // Reset state
    setAttempted(null);
    setDescription("");
  };

  const handleCancel = () => {
    setAttempted(null);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Formulärförsök</DialogTitle>
          <DialogDescription>
            Har kunden försökt fylla i formuläret hemma/online?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selection Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={attempted === true ? "default" : "outline"}
              size="lg"
              className="h-24 flex flex-col gap-2"
              onClick={() => setAttempted(true)}
            >
              <CheckCircle2 className="h-8 w-8" />
              <span className="font-semibold">Ja, försökte fylla i</span>
            </Button>
            
            <Button
              type="button"
              variant={attempted === false ? "default" : "outline"}
              size="lg"
              className="h-24 flex flex-col gap-2"
              onClick={() => setAttempted(false)}
            >
              <XCircle className="h-8 w-8" />
              <span className="font-semibold">Nej, första gången</span>
            </Button>
          </div>

          {/* Optional Description - only shown if attempted */}
          {attempted === true && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="failure-description">
                Vad gick fel? (valfritt)
              </Label>
              <Textarea
                id="failure-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="T.ex. 'Tekniskt fel på telefonen', 'Glömde bort', 'Kunde inte hitta länken', etc."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Denna information hjälper oss förbättra systemet och hitta buggar
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Tillbaka
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={attempted === null}
          >
            Fortsätt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormAttemptDialog;
