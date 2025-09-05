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
      <DialogContent className="sm:max-w-[560px] p-8">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <IdCard className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">Legitimationskontroll</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            Kontrollera kundens legitimation innan du skapar formuläret för <strong>{customerName}</strong>.
            Detta är obligatoriskt för alla direktformulär som fylls i butik.
          </DialogDescription>
        </DialogHeader>

        {!isCompleted ? (
          <div className="space-y-6 py-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Obligatorisk legitimationskontroll</strong><br />
                Enligt gällande föreskrifter måste legitimation kontrolleras och verifieras innan undersökningen påbörjas.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Vilken typ av legitimation kontrollerar du?</Label>
              <div className="grid gap-3">
                {ID_TYPES.map((idType) => (
                  <div key={idType.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50">
                    <Checkbox
                      id={idType.id}
                      checked={selectedIdTypes[idType.id] || false}
                      onCheckedChange={(checked) => handleIdTypeChange(idType.id, !!checked)}
                      disabled={isVerifying}
                    />
                    <Label 
                      htmlFor={idType.id} 
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {idType.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="personalNumber" className="text-base font-semibold">
                Personnummer från legitimation
              </Label>
              <Input
                id="personalNumber"
                placeholder="ÅÅÅÅMMDD-XXXX"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                disabled={isVerifying}
                className="h-12 text-base font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Ange det fullständiga personnumret som det står på legitimationen
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Legitimation verifierad</h3>
                <p className="text-muted-foreground">
                  {selectedIdLabel} har kontrollerats för {customerName}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Personnummer: {personalNumber}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isVerifying}
            className="px-6 py-3"
          >
            Avbryt
          </Button>

          {!isCompleted ? (
            <>
              <Button
                variant="outline"
                onClick={() => onConfirm({ idType: 'deferred', personalNumber: 'pending' })}
                disabled={isVerifying}
                className="px-6 py-3 border-accent_coral/50 text-accent_coral hover:bg-accent_coral/10"
              >
                Kunden legitimerar sig senare
              </Button>
              
              <Button
                onClick={handleCompleteVerification}
                disabled={!canComplete || isVerifying}
                className="px-6 py-3"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifierar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Bekräfta legitimation nu
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="px-6 py-3"
            >
              Gå till formulär
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};