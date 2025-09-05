/**
 * IdVerificationQuickUpdate provides a quick update interface for adding ID verification
 * to entries that were created with deferred ID verification. This allows opticians to
 * update ID information for entries with status 'pending_id_verification' and change
 * the status to 'ready' once verification is complete.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { IdCard, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useIdVerificationSave } from "@/hooks/useIdVerificationSave";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useUser } from "@clerk/clerk-react";
import { toast } from "@/hooks/use-toast";

interface IdVerificationQuickUpdateProps {
  entryId: string;
  customerName: string;
  onVerificationComplete: () => void;
}

const ID_TYPES = [
  { id: 'swedish_license', label: 'Svenskt körkort' },
  { id: 'swedish_id', label: 'Svensk ID-handling' },
  { id: 'passport', label: 'Pass' },
  { id: 'guardian_certificate', label: 'Målsmansbevis/vårdnadshavarintyg' }
];

export const IdVerificationQuickUpdate = ({
  entryId,
  customerName,
  onVerificationComplete
}: IdVerificationQuickUpdateProps) => {
  const [selectedIdTypes, setSelectedIdTypes] = useState<{ [key: string]: boolean }>({});
  const [personalNumber, setPersonalNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const { saveIdVerificationToEntry } = useIdVerificationSave();
  const { supabase } = useSupabaseClient();
  const { user } = useUser();

  const handleIdTypeChange = (idTypeId: string, checked: boolean) => {
    setSelectedIdTypes(prev => ({
      ...prev,
      [idTypeId]: checked
    }));
  };

  const handleCompleteVerification = async () => {
    const selectedType = Object.keys(selectedIdTypes).find(key => selectedIdTypes[key]);
    
    if (!selectedType || !personalNumber.trim() || !user || !supabase) {
      return;
    }

    setIsVerifying(true);

    try {
      // Save ID verification data
      await saveIdVerificationToEntry(entryId, {
        idType: selectedType,
        personalNumber: personalNumber.trim(),
        userId: user.id
      });

      // Update entry status from pending_id_verification to ready
      const { error } = await supabase
        .from("anamnes_entries")
        .update({
          status: "ready"
        })
        .eq("id", entryId);

      if (error) {
        throw error;
      }

      setIsCompleted(true);
      
      toast({
        title: "Legitimation uppdaterad",
        description: "Legitimationskontrollen är nu klar och anamnesen är redo för undersökning"
      });

      onVerificationComplete();
    } catch (error) {
      console.error('Error updating ID verification:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera legitimationskontrollen",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedIdType = Object.keys(selectedIdTypes).find(key => selectedIdTypes[key]);
  const selectedIdLabel = ID_TYPES.find(type => type.id === selectedIdType)?.label;
  const canComplete = selectedIdType && personalNumber.trim().length > 0;

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-green-800">Legitimation verifierad</h3>
              <p className="text-green-700">
                {selectedIdLabel} har kontrollerats för {customerName}
              </p>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-2">
                Personnummer: {personalNumber}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <IdCard className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Uppdatera legitimationskontroll</h3>
        </div>
        <p className="text-sm text-yellow-700">
          Slutför legitimationskontrollen för {customerName} för att sätta anamnesen som klar för undersökning.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            <strong>Obligatorisk legitimationskontroll</strong><br />
            Enligt gällande föreskrifter måste legitimation kontrolleras och verifieras innan undersökningen påbörjas.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Label className="text-sm font-semibold">Vilken typ av legitimation kontrollerar du?</Label>
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
                  className="text-sm cursor-pointer flex-1"
                >
                  {idType.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="personalNumber" className="text-sm font-semibold">
            Personnummer från legitimation
          </Label>
          <Input
            id="personalNumber"
            placeholder="ÅÅÅÅMMDD-XXXX"
            value={personalNumber}
            onChange={(e) => setPersonalNumber(e.target.value)}
            disabled={isVerifying}
            className="h-10 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Ange det fullständiga personnumret som det står på legitimationen
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCompleteVerification}
            disabled={!canComplete || isVerifying}
            className="px-6"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uppdaterar...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Bekräfta legitimation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};