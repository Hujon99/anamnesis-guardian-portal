/**
 * Component for mandatory ID verification during driving license examinations.
 * Ensures that proper identification is checked and documented before 
 * the examination can be completed, as required by Swedish regulations.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { IdCard, CheckCircle, AlertTriangle, User } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

interface IdVerificationProps {
  examination: any;
  onSave: (updates: any) => Promise<void>;
  onNext: () => void;
  isSaving: boolean;
}

interface IdType {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export const IdVerification: React.FC<IdVerificationProps> = ({
  examination,
  onSave,
  onNext,
  isSaving
}) => {
  const { user } = useUser();
  
  const [idTypes, setIdTypes] = useState<IdType[]>([
    {
      id: 'swedish_license',
      label: 'Svenskt körkort',
      description: 'Giltigt svenskt körkort med foto',
      checked: examination?.id_type === 'swedish_license'
    },
    {
      id: 'swedish_id',
      label: 'Svenskt ID-kort',
      description: 'Nationellt ID-kort utfärdat av Skatteverket',
      checked: examination?.id_type === 'swedish_id'
    },
    {
      id: 'passport',
      label: 'Pass',
      description: 'Giltigt pass (svenskt eller utländskt)',
      checked: examination?.id_type === 'passport'
    },
    {
      id: 'guardian_certificate',
      label: 'Identitetsintyg',
      description: 'För personer under 18 år - vårdnadshavare fylls i av personal',
      checked: examination?.id_type === 'guardian_certificate'
    }
  ]);

  const [isVerified, setIsVerified] = useState(examination?.id_verification_completed || false);
  const [personalNumber, setPersonalNumber] = useState(examination?.personal_number || '');

  const handleIdTypeChange = (idTypeId: string, checked: boolean) => {
    setIdTypes(prev => prev.map(type => ({
      ...type,
      checked: type.id === idTypeId ? checked : false // Only one can be checked
    })));
  };

  const handleCompleteVerification = async () => {
    const selectedIdType = idTypes.find(type => type.checked);
    
    if (!selectedIdType) {
      return;
    }

    const updates = {
      id_verification_completed: true,
      id_type: selectedIdType.id,
      verified_by: user?.fullName || user?.firstName || 'Unknown',
      verified_at: new Date().toISOString(),
      personal_number: personalNumber.trim() || null
    };

    await onSave(updates);
    setIsVerified(true);
  };

  const selectedIdType = idTypes.find(type => type.checked);
  const canVerify = selectedIdType && personalNumber.trim() && !isVerified;
  const isCompleted = examination?.id_verification_completed || isVerified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="h-5 w-5" />
          Legitimationskontroll
          {isCompleted && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Verifierad
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Information */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Obligatoriskt steg</p>
              <p className="text-sm">
                Legitimation måste kontrolleras och bekräftas av personal innan körkortsundersökningen 
                kan slutföras. Välj typ av legitimation som visats upp.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* ID type selection */}
        <div className="space-y-4">
          <h4 className="font-medium">Typ av legitimation</h4>
          
          <div className="grid gap-3">
            {idTypes.map((idType) => (
              <div 
                key={idType.id}
                className={`flex items-start space-x-3 p-3 border rounded-lg ${
                  idType.checked ? 'border-primary bg-primary/5' : 'border-border'
                } ${isCompleted ? 'opacity-75' : ''}`}
              >
                <Checkbox
                  id={idType.id}
                  checked={idType.checked}
                  onCheckedChange={(checked) => !isCompleted && handleIdTypeChange(idType.id, Boolean(checked))}
                  disabled={isCompleted}
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={idType.id} 
                    className={`font-medium ${isCompleted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {idType.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {idType.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal number input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <h4 className="font-medium">Personnummer</h4>
          </div>
          <div className="space-y-2">
            <Label htmlFor="personal-number">Personnummer (obligatoriskt)</Label>
            <Input
              id="personal-number"
              type="text"
              placeholder="YYYYMMDD-XXXX eller YYYYMMDDXXXX"
              value={personalNumber}
              onChange={(e) => setPersonalNumber(e.target.value)}
              disabled={isCompleted}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Ange personnummer som det står på legitimationen
            </p>
          </div>
        </div>

        {/* Verification status */}
        {isCompleted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Legitimation verifierad</p>
                <p className="text-sm">
                  Verifierad av: {examination?.verified_by || 'Unknown'}
                </p>
                <p className="text-sm">
                  Personnummer: {examination?.personal_number || 'Ej angivet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {examination?.verified_at && 
                    `Tid: ${new Date(examination.verified_at).toLocaleString('sv-SE')}`
                  }
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex justify-between">
          {!isCompleted && (
            <Button
              onClick={handleCompleteVerification}
              disabled={!canVerify || isSaving}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isSaving ? "Verifierar..." : "Bekräfta legitimation"}
            </Button>
          )}
          
          <Button
            onClick={onNext}
            disabled={!isCompleted}
            variant={isCompleted ? "default" : "outline"}
          >
            {isCompleted ? "Gå till slutförande" : "Måste verifieras först"}
          </Button>
        </div>

        {/* Help text for personal number */}
        {!isCompleted && personalNumber.length > 0 && personalNumber.length < 10 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Kontrollera att personnumret är korrekt ifyllt innan du bekräftar legitimationen.
            </AlertDescription>
          </Alert>
        )}

        {!isCompleted && !personalNumber.trim() && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Personnummer måste fyllas i för att kunna bekräfta legitimationen.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning if not completed */}
        {!isCompleted && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Körkortsundersökningen kan inte slutföras utan legitimationskontroll.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};