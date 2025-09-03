/**
 * Final summary and completion component for driving license examinations.
 * Provides an overview of all measurements, verifications, and allows the optician
 * to make the final decision on whether the examination passes or requires further action.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Eye, IdCard, AlertTriangle, FileText, Calendar, Clock } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
interface ExaminationSummaryProps {
  examination: any;
  entry: AnamnesesEntry;
  onSave: (updates: any) => Promise<void>;
  onComplete: () => void;
  isSaving: boolean;
}
export const ExaminationSummary: React.FC<ExaminationSummaryProps> = ({
  examination,
  entry,
  onSave,
  onComplete,
  isSaving
}) => {
  const [notes, setNotes] = useState(examination?.notes || '');
  const [decision, setDecision] = useState<'pass' | 'fail' | 'needs_booking' | null>(examination?.examination_status === 'completed' ? examination?.passed_examination ? 'pass' : examination?.requires_optician_visit ? 'needs_booking' : 'fail' : null);

  // Check if examination meets requirements
  const hasMeasurements = !!(examination?.visual_acuity_both_eyes || examination?.visual_acuity_right_eye || examination?.visual_acuity_left_eye);
  const visionPassed = hasMeasurements && !examination?.vision_below_limit;
  const idVerified = examination?.id_verification_completed;
  const canPass = visionPassed && idVerified;
  const handleComplete = async () => {
    if (!decision) return;
    const updates = {
      examination_status: 'completed',
      passed_examination: decision === 'pass',
      requires_optician_visit: decision === 'needs_booking',
      notes: notes.trim() || null
    };
    try {
      await onSave(updates);

      // Update the entry status if examination passed
      if (decision === 'pass') {
        toast({
          title: "Undersökning godkänd",
          description: "Körkortsundersökningen har slutförts framgångsrikt"
        });
      } else if (decision === 'needs_booking') {
        toast({
          title: "Bokning krävs",
          description: "Kunden har bokats för vidare undersökning"
        });
      } else {
        toast({
          title: "Undersökning ej godkänd",
          description: "Körkortsundersökningen uppfyller inte kraven"
        });
      }
      onComplete();
    } catch (error) {
      console.error('Error completing examination:', error);
    }
  };
  const getDecisionBadge = () => {
    switch (decision) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Godkänd
          </Badge>;
      case 'fail':
        return <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Ej godkänd
          </Badge>;
      case 'needs_booking':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Calendar className="h-3 w-3 mr-1" />
            Bokning krävs
          </Badge>;
      default:
        return null;
    }
  };
  const isCompleted = examination?.examination_status === 'completed';
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sammanfattning och beslut
          {isCompleted && getDecisionBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient info */}
        <div className="space-y-2">
          <h4 className="font-medium">Patientinformation</h4>
          <div className="text-sm space-y-1">
            <p>Namn: {entry.first_name}</p>
            <p>Datum: {entry.booking_date ? new Date(entry.booking_date).toLocaleDateString('sv-SE') : 'Idag'}</p>
            <p>Tid: {new Date().toLocaleTimeString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        <Separator />

        {/* Visual acuity summary */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visusmätningar
            {(examination?.uses_glasses || examination?.uses_contact_lenses) && <Badge variant="secondary" className="text-xs">
                Med korrektion
              </Badge>}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p>Båda ögon: <span className="font-mono">
                {examination?.uses_glasses || examination?.uses_contact_lenses ? examination?.visual_acuity_with_correction_both || examination?.visual_acuity_both_eyes || 'Ej mätt' : examination?.visual_acuity_both_eyes || 'Ej mätt'}
              </span></p>
              <p>Höger öga: <span className="font-mono">
                {examination?.uses_glasses || examination?.uses_contact_lenses ? examination?.visual_acuity_with_correction_right || examination?.visual_acuity_right_eye || 'Ej mätt' : examination?.visual_acuity_right_eye || 'Ej mätt'}
              </span></p>
              <p>Vänster öga: <span className="font-mono">
                {examination?.uses_glasses || examination?.uses_contact_lenses ? examination?.visual_acuity_with_correction_left || examination?.visual_acuity_left_eye || 'Ej mätt' : examination?.visual_acuity_left_eye || 'Ej mätt'}
              </span></p>
            </div>
            
          </div>
          
          {examination?.vision_below_limit ? <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Visusvärden är under gränsvärdet för körkort
              </AlertDescription>
            </Alert> : <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Visusvärden uppfyller kraven för körkort
              </AlertDescription>
            </Alert>}
        </div>

        <Separator />

        {/* ID verification summary */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <IdCard className="h-4 w-4" />
            Legitimationskontroll
          </h4>
          
          {examination?.id_verification_completed ? <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>Legitimation verifierad</p>
                  <p className="text-xs text-muted-foreground">
                    Typ: {examination?.id_type?.replace('_', ' ')} | Verifierad av: {examination?.verified_by}
                  </p>
                </div>
              </AlertDescription>
            </Alert> : <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Legitimation ej verifierad
              </AlertDescription>
            </Alert>}
        </div>

        <Separator />

        {/* Decision section */}
        {!isCompleted && <div className="space-y-4">
            <h4 className="font-medium">Beslut</h4>
            
            {canPass ? <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Alla krav är uppfyllda. Körkortsundersökningen kan godkännas.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button onClick={() => setDecision('pass')} variant={decision === 'pass' ? 'default' : 'outline'} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Godkänn undersökning
                  </Button>
                  
                  <Button onClick={() => setDecision('needs_booking')} variant={decision === 'needs_booking' ? 'default' : 'outline'}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Boka vidare undersökning
                  </Button>
                </div>
              </div> : <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Undersökningen kan inte godkännas på grund av:
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {!visionPassed && <li>Visus under gränsvärde</li>}
                      {!idVerified && <li>Legitimation ej verifierad</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <Button onClick={() => setDecision('needs_booking')} variant={decision === 'needs_booking' ? 'default' : 'outline'}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Boka för vidare undersökning
                </Button>
              </div>}
          </div>}

        {/* Notes section */}
        <div className="space-y-2">
          <Label htmlFor="notes">Anteckningar</Label>
          <Textarea id="notes" placeholder="Skriv eventuella anteckningar eller kommentarer..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} disabled={isCompleted} />
        </div>

        {/* Completion */}
        {isCompleted ? <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Undersökning slutförd {new Date(examination.updated_at).toLocaleString('sv-SE')}</span>
                {getDecisionBadge()}
              </div>
            </AlertDescription>
          </Alert> : <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onComplete}>
              Avbryt
            </Button>
            <Button onClick={handleComplete} disabled={!decision || isSaving}>
              {isSaving ? "Sparar..." : "Slutför undersökning"}
            </Button>
          </div>}
      </CardContent>
    </Card>;
};