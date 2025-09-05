/**
 * IdVerificationDialog provides a modal interface for ID verification during direct form creation.
 * This component reuses the same ID verification logic as the driving license examination
 * but in a dialog format for the direct form flow. It saves ID verification data directly
 * to anamnes_entries for all direct in-store forms.
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { IdCard, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface IdVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (idData: IdVerificationData) => void;
  isVerifying: boolean;
  customerName: string;
}

interface IdVerificationData {
  idType: string;
  personalNumber: string;
}

const ID_TYPES = [
  { id: 'swedish_license', label: 'Svenskt körkort' },
  { id: 'swedish_id', label: 'Svensk ID-handling' },
  { id: 'passport', label: 'Pass' },
  { id: 'guardian_certificate', label: 'Målsmansbevis/vårdnadshavarintyg' }
];

export const IdVerificationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isVerifying,
  customerName
}: IdVerificationDialogProps) => {
  const [selectedIdTypes, setSelectedIdTypes] = useState<{ [key: string]: boolean }>({});
  const [personalNumber, setPersonalNumber] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const handleIdTypeChange = (idTypeId: string, checked: boolean) => {
    setSelectedIdTypes(prev => ({
      ...prev,
      [idTypeId]: checked
    }));
  };

  const handleCompleteVerification = () => {
    const selectedType = Object.keys(selectedIdTypes).find(key => selectedIdTypes[key]);
    
    if (!selectedType || !personalNumber.trim()) {
      return;
    }

    const idData: IdVerificationData = {
      idType: selectedType,
      personalNumber: personalNumber.trim()
    };

    setIsCompleted(true);
    onConfirm(idData);
  };

  const handleCancel = () => {
    setSelectedIdTypes({});
    setPersonalNumber("");
    setIsCompleted(false);
    onOpenChange(false);
  };

  const selectedIdType = Object.keys(selectedIdTypes).find(key => selectedIdTypes[key]);
  const selectedIdLabel = ID_TYPES.find(type => type.id === selectedIdType)?.label;
  const canComplete = selectedIdType && personalNumber.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[580px] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <IdCard className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-semibold">Legitimationskontroll</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground mt-2">
            Kontrollera kundens legitimation innan du skapar formuläret för <strong>{customerName}</strong>. 
            Detta är obligatoriskt för alla direktformulär som fylls i butik.
          </DialogDescription>
        </DialogHeader>

        {!isCompleted ? (
          <div className="px-6 space-y-8">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Obligatorisk legitimationskontroll</strong><br />
                Enligt gällande föreskrifter måste legitimation kontrolleras och verifieras innan undersökningen påbörjas.
              </AlertDescription>
            </Alert>

            <div className="space-y-5">
              <Label className="text-base font-semibold text-foreground">
                Vilken typ av legitimation kontrollerar du?
              </Label>
              <div className="space-y-3">
                {ID_TYPES.map((idType) => (
                  <div key={idType.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/30 transition-colors">
                    <Checkbox
                      id={idType.id}
                      checked={selectedIdTypes[idType.id] || false}
                      onCheckedChange={(checked) => handleIdTypeChange(idType.id, !!checked)}
                      disabled={isVerifying}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor={idType.id} 
                      className="text-sm font-normal cursor-pointer flex-1 leading-relaxed"
                    >
                      {idType.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="personalNumber" className="text-base font-semibold text-foreground">
                Personnummer från legitimation
              </Label>
              <Input
                id="personalNumber"
                placeholder="ÅÅÅÅMMDD-XXXX"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                disabled={isVerifying}
                className="h-11 text-base font-mono tracking-wide"
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ange det fullständiga personnumret som det står på legitimationen
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-xl text-foreground">Legitimation verifierad</h3>
                <p className="text-muted-foreground text-base">
                  {selectedIdLabel} har kontrollerats för {customerName}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-2 text-sm font-medium">
                Personnummer: {personalNumber}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 pt-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isVerifying}
            className="order-1 sm:order-1"
          >
            Avbryt
          </Button>

          {!isCompleted ? (
            <>
              <Button
                variant="outline"
                onClick={() => onConfirm({ idType: 'deferred', personalNumber: 'pending' })}
                disabled={isVerifying}
                className="order-2 sm:order-2 border-accent_coral/50 text-accent_coral hover:bg-accent_coral/10 hover:border-accent_coral"
              >
                Kunden legitimerar sig senare
              </Button>
              
              <Button
                onClick={handleCompleteVerification}
                disabled={!canComplete || isVerifying}
                className="order-3 sm:order-3 bg-primary hover:bg-primary/90"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifierar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Bekräfta legitimation
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="order-2 sm:order-2 bg-primary hover:bg-primary/90"
            >
              Gå till formulär
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};