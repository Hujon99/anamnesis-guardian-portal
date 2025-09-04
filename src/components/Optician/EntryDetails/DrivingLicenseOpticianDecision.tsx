/**
 * Component for opticians to make final decisions on driving license examinations.
 * Only available to assigned opticians and shows after examination is completed.
 * Handles the decision making (approved/requires_booking/not_approved) with notes.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Calendar, FileText, Clock, User } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface DrivingLicenseOpticianDecisionProps {
  examination: DrivingLicenseExamination;
  entry: AnamnesesEntry;
  currentUserId: string;
  onDecisionMade?: () => void;
  getUserName?: (userId: string | null) => string;
}

export const DrivingLicenseOpticianDecision: React.FC<DrivingLicenseOpticianDecisionProps> = ({
  examination,
  entry,
  currentUserId,
  onDecisionMade,
  getUserName
}) => {
  const [decision, setDecision] = useState<'approved' | 'requires_booking' | 'not_approved' | null>(
    examination.optician_decision as any || null
  );
  const [notes, setNotes] = useState(examination.optician_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const { supabase } = useSupabaseClient();
  
  // Check if current user is assigned to this case
  const isAssignedOptician = entry.optician_id === currentUserId;
  const hasDecision = !!examination.optician_decision;
  
  const handleSaveDecision = async () => {
    if (!decision || !isAssignedOptician) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('driving_license_examinations')
        .update({
          optician_decision: decision,
          optician_decision_date: new Date().toISOString(),
          optician_notes: notes.trim() || null,
          decided_by: currentUserId
        })
        .eq('id', examination.id);

      if (error) throw error;

      toast({
        title: "Beslut sparat",
        description: "Ditt beslut har sparats för körkortsundersökningen."
      });

      onDecisionMade?.();
    } catch (error: any) {
      console.error('Error saving decision:', error);
      toast({
        title: "Kunde inte spara beslut",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDecisionBadge = (decisionType: string) => {
    switch (decisionType) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Godkänd
          </Badge>
        );
      case 'not_approved':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Ej godkänd
          </Badge>
        );
      case 'requires_booking':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Calendar className="h-3 w-3 mr-1" />
            Bokning krävs
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!isAssignedOptician) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Du är inte tilldelad som ansvarig optiker för detta ärende.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Optikerbeslut
          {hasDecision && getDecisionBadge(examination.optician_decision!)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasDecision ? (
          // Show existing decision
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Beslut fattat:</span>
              {getDecisionBadge(examination.optician_decision!)}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Datum: {new Date(examination.optician_decision_date!).toLocaleString('sv-SE')}</p>
              <p>Av: {getUserName ? getUserName(examination.decided_by) : examination.decided_by}</p>
            </div>

            {examination.optician_notes && (
              <div className="space-y-2">
                <Label>Anteckningar:</Label>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {examination.optician_notes}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Decision making interface
          <div className="space-y-6">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Som ansvarig optiker behöver du fatta det slutgiltiga beslutet för denna körkortsundersökning.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Label>Välj beslut:</Label>
              <div className="space-y-2">
                <Button
                  onClick={() => setDecision('approved')}
                  variant={decision === 'approved' ? 'default' : 'outline'}
                  className="w-full justify-start"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Godkänn körkortsundersökning
                </Button>
                
                <Button
                  onClick={() => setDecision('requires_booking')}
                  variant={decision === 'requires_booking' ? 'default' : 'outline'}
                  className="w-full justify-start"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Kräver ytterligare undersökning
                </Button>
                
                <Button
                  onClick={() => setDecision('not_approved')}
                  variant={decision === 'not_approved' ? 'default' : 'outline'}
                  className="w-full justify-start"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Godkänn ej körkortsundersökning
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decision-notes">Anteckningar (valfritt):</Label>
              <Textarea
                id="decision-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lägg till eventuella anteckningar om beslutet..."
                rows={4}
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleSaveDecision}
                disabled={!decision || isSaving}
                className="flex-1"
              >
                {isSaving ? "Sparar..." : "Spara beslut"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};