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
import { useUserResolver } from "@/utils/userDisplayUtils";

interface IdVerificationProps {
  examination: any;
  entry: any;
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
  entry,
  onSave,
  onNext,
  isSaving
}) => {
  const { user } = useUser();
  const { resolveUserDisplay } = useUserResolver();
  
  // Check if ID verification is already completed in anamnes_entries
  const entryIdVerified = entry?.id_verification_completed || false;
  const entryIdType = entry?.id_type;
  const entryPersonalNumber = entry?.personal_number || '';
  
  const [idTypes, setIdTypes] = useState<IdType[]>([
    {
      id: 'swedish_license',
      label: 'Svenskt körkort',
      description: 'Giltigt svenskt körkort med foto',
      checked: (entryIdType || examination?.id_type) === 'swedish_license'
    },
    {
      id: 'swedish_id',
      label: 'Svenskt ID-kort',
      description: 'Nationellt ID-kort utfärdat av Skatteverket',
      checked: (entryIdType || examination?.id_type) === 'swedish_id'
    },
    {
      id: 'passport',
      label: 'Pass',
      description: 'Giltigt pass (svenskt eller utländskt)',
      checked: (entryIdType || examination?.id_type) === 'passport'
    },
    {
      id: 'guardian_certificate',
      label: 'Identitetsintyg',
      description: 'För personer under 18 år - vårdnadshavare fylls i av personal',
      checked: (entryIdType || examination?.id_type) === 'guardian_certificate'
    }
  ]);

  const [isVerified, setIsVerified] = useState(entryIdVerified || examination?.id_verification_completed || false);
  const [personalNumber, setPersonalNumber] = useState(entryPersonalNumber || examination?.personal_number || '');

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

    console.log('[IdVerification] Saving with personal_number:', personalNumber.trim());

    // For driving license examinations, we need to save to both places:
    // 1. Update the driving_license_examinations record
    // 2. Update the anamnes_entries with ID verification data
    
    try {
      // First save to the driving license examination record
      const drivingLicenseUpdates = {
        id_verification_completed: true,
        id_type: selectedIdType.id,
        verified_by: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.fullName || 'Unknown',
        verified_at: new Date().toISOString(),
        personal_number: personalNumber.trim() || null
      };

      console.log('[IdVerification] Updates object:', drivingLicenseUpdates);
      await onSave(drivingLicenseUpdates);
      
      // Also save to anamnes_entries if we have access to update the entry
      if (entry?.id) {
        const { useSupabaseClient } = await import('@/hooks/useSupabaseClient');
        const { supabase: supabaseClient } = useSupabaseClient();
        
        if (supabaseClient) {
          const anamnesUpdates = {
            id_verification_completed: true,
            id_type: selectedIdType.id as "swedish_license" | "swedish_id" | "passport" | "guardian_certificate",
            personal_number: personalNumber.trim() || null,
            verified_by: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.fullName || 'Unknown',
            verified_at: new Date().toISOString(),
            // Update status from pending_id_verification to ready if it was deferred
            ...(entry.status === 'pending_id_verification' ? { status: 'ready' } : {})
          };
          
          const { error } = await supabaseClient
            .from('anamnes_entries')
            .update(anamnesUpdates)
            .eq('id', entry.id);
            
          if (error) {
            console.warn('[IdVerification] Failed to update anamnes_entries:', error);
            // Don't throw error, as the driving license examination was saved successfully
          } else {
            console.log('[IdVerification] Successfully updated anamnes_entries');
          }
        }
      }
      
      setIsVerified(true);
    } catch (error) {
      console.error('[IdVerification] Error during verification:', error);
      throw error;
    }
  };

  const handleDeferVerification = async () => {
    try {
      // Update anamnes_entries to mark that ID verification is deferred
      if (entry?.id) {
        const { useSupabaseClient } = await import('@/hooks/useSupabaseClient');
        const { supabase: supabaseClient } = useSupabaseClient();
        
        if (supabaseClient) {
          const { error } = await supabaseClient
            .from('anamnes_entries')
            .update({
              status: 'pending_id_verification',
              id_verification_completed: false
            })
            .eq('id', entry.id);
            
          if (error) {
            console.error('[IdVerification] Failed to defer verification:', error);
            throw error;
          }
        }
      }
      
      // Continue to next step without verification
      onNext();
    } catch (error) {
      console.error('[IdVerification] Error deferring verification:', error);
    }
  };

  const selectedIdType = idTypes.find(type => type.checked);
  const canVerify = selectedIdType && personalNumber.trim() && !isVerified;
  const isCompleted = entryIdVerified || examination?.id_verification_completed || isVerified;
  const canProceed = isCompleted || entry?.status === 'pending_id_verification';

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
                   Verifierad av: {resolveUserDisplay(entry?.verified_by || examination?.verified_by)}
                 </p>
                 <p className="text-sm">
                   Personnummer: {entryPersonalNumber || examination?.personal_number || 'Ej angivet'}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   {(entry?.verified_at || examination?.verified_at) && 
                     `Tid: ${new Date(entry?.verified_at || examination.verified_at).toLocaleString('sv-SE')}`
                   }
                 </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between mt-8 pt-4 border-t">
          {!isCompleted && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleDeferVerification}
                disabled={isSaving}
                className="border-accent_coral/50 text-accent_coral hover:bg-accent_coral/10 hover:border-accent_coral"
              >
                Kunden legitimerar sig senare
              </Button>
              
              <Button
                onClick={handleCompleteVerification}
                disabled={!canVerify || isSaving}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isSaving ? "Verifierar..." : "Bekräfta legitimation nu"}
              </Button>
            </div>
          )}
          
          <Button
            onClick={onNext}
            disabled={!canProceed}
            variant={isCompleted ? "default" : "outline"}
            className={isCompleted ? "" : "w-full sm:w-auto"}
          >
            {isCompleted ? "Nästa steg" : canProceed ? "Fortsätt utan verifiering" : "Måste verifieras först"}
          </Button>
        </div>

        {/* Help text for personal number */}
        {!isCompleted && personalNumber.length > 0 && personalNumber.length < 10 && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Kontrollera att personnumret är korrekt ifyllt innan du bekräftar legitimationen.
            </AlertDescription>
          </Alert>
        )}

        {!isCompleted && !personalNumber.trim() && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Personnummer måste fyllas i för att kunna bekräfta legitimationen.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning if not completed */}
        {!isCompleted && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Körkortsundersökningen kan inte slutföras utan legitimationskontroll, men du kan låta kunden legitimera sig senare.
            </AlertDescription>
          </Alert>
        )}

        {/* Show deferred verification notice */}
        {entry?.status === 'pending_id_verification' && (
          <Alert className="border-yellow-200 bg-yellow-50 mt-4">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="space-y-1">
                <p className="font-medium">Legitimationskontroll väntar</p>
                <p className="text-sm">
                  Denna undersökning väntar på legitimationskontroll. Kunden kan legitimera sig nu eller fortsätta med undersökningen.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};