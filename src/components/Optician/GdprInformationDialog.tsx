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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Users, Shield } from "lucide-react";

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
  const [infoType, setInfoType] = useState<'full' | 'short'>('full');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!isConfirmed) return;
    
    onConfirm({
      infoType,
      notes: notes.trim() || undefined
    });
    
    // Reset form
    setIsConfirmed(false);
    setNotes('');
    setInfoType('full');
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    setNotes('');
    setInfoType('full');
    onOpenChange(false);
  };

  const fullText = "Vi behöver samla in vissa uppgifter om din syn och hälsa inför undersökningen. Din optiker är ansvarig för dessa uppgifter och de sparas i journalsystemet enligt lag. Uppgifterna används bara för att kunna genomföra din undersökning och sparas inte längre än nödvändigt. Du har rätt att få veta vilka uppgifter som finns, få fel rättade och i vissa fall begära radering.";
  
  const shortText = "Vi behandlar dina uppgifter enligt GDPR och Patientdatalagen, bara för din undersökning och med lagstadgad journalföring.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            GDPR-information för patienten
          </DialogTitle>
          <DialogDescription className="text-sm">
            Informera patienten om hur personuppgifter behandlas för {examinationType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Information text selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Välj informationstext att läsa upp för patienten:
            </Label>
            
            <RadioGroup value={infoType} onValueChange={(value: 'full' | 'short') => setInfoType(value)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="font-medium">Full text (rekommenderas)</Label>
                  </div>
                  <Card className="ml-6 border-2 transition-colors" data-selected={infoType === 'full'}>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        "{fullText}"
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short" className="font-medium">Kort text (vid tidsbrist)</Label>
                  </div>
                  <Card className="ml-6 border-2 transition-colors" data-selected={infoType === 'short'}>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        "{shortText}"
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </RadioGroup>
          </div>

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