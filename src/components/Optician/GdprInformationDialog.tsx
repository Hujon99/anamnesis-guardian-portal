/**
 * GDPR Information Dialog for in-store form creation
 * Displays GDPR information to staff and requires confirmation that patient has been informed
 * before proceeding with form creation. Includes logging of confirmations.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield } from "lucide-react";

interface GdprInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { infoType: 'full' | 'short'; notes?: string }) => void;
  isProcessing?: boolean;
  examinationType: string;
}

export const GdprInformationDialog: React.FC<GdprInformationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
  examinationType
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!isConfirmed) return;
    
    onConfirm({
      infoType: 'short',
      notes: notes.trim() || undefined
    });
    
    // Reset form
    setIsConfirmed(false);
    setNotes('');
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    setNotes('');
    onOpenChange(false);
  };

  const gdprText = "Dina uppgifter sparas i journalen enligt lag och används bara för din undersökning.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            GDPR-information
          </DialogTitle>
          <DialogDescription className="text-sm">
            Läs upp följande för patienten innan {examinationType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Information text */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed font-medium">
                "{gdprText}"
              </p>
            </CardContent>
          </Card>

          {/* Confirmation checkbox */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="patient-informed"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="mt-1"
              />
              <div className="space-y-1 flex-1">
                <Label 
                  htmlFor="patient-informed" 
                  className="text-sm font-medium leading-relaxed cursor-pointer block"
                >
                  Patienten har informerats muntligen om hur personuppgifter behandlas och har bekräftat detta.
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Denna bekräftelse är obligatorisk och kommer att loggas.
                </p>
              </div>
            </div>
          </div>

          {/* Optional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Anteckningar (valfritt)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. 'Informerat vid receptionen, patient bekräftade muntligen'"
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500 tecken
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="min-w-[100px]"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmed || isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                Fortsätter...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Fortsätt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};