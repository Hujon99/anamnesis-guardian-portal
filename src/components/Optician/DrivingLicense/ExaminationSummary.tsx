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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Eye, IdCard, AlertTriangle, FileText, Calendar, Clock, User } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { RecommendationEngine } from "./RecommendationEngine";
import { useUserResolver } from "@/utils/userDisplayUtils";
import { formatVisualAcuityDisplay } from "@/lib/number-utils";
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
  const [selectedOpticianId, setSelectedOpticianId] = useState<string>('');
  
  // Load opticians for assignment
  const { opticians, isLoading: loadingOpticians } = useOpticians();
  
  // Use mutation hook for better error handling
  const { assignOptician } = useEntryMutations(entry.id);
  
  // Use supabase client for email notifications
  const { supabase } = useSupabaseClient();

  // User resolver for displaying names
  const { resolveUserDisplay } = useUserResolver();

  // Check if examination meets requirements
  const hasMeasurements = !!(examination?.visual_acuity_both_eyes || examination?.visual_acuity_right_eye || examination?.visual_acuity_left_eye);
  const visionPassed = hasMeasurements && !examination?.vision_below_limit;
  // Use either the entry record or the examination record (modal keeps a stale entry until parent refetches)
  const idVerified = Boolean(entry?.id_verification_completed || examination?.id_verification_completed);
  const idType = entry?.id_type || examination?.id_type;
  const verifiedBy = entry?.verified_by || examination?.verified_by;
  const canPass = visionPassed && idVerified;
  
  const handleComplete = async () => {
    if (!selectedOpticianId) {
      toast({
        title: "Ingen optiker vald",
        description: "Du måste välja en ansvarig optiker innan du kan slutföra undersökningen.",
        variant: "destructive"
      });
      return;
    }

    // Find the selected optician and verify email
    const selectedOptician = opticians.find(opt => opt.clerk_user_id === selectedOpticianId);
    if (!selectedOptician?.email) {
      toast({
        title: "E-post saknas",
        description: "Den valda optikern har ingen e-postadress registrerad",
        variant: "destructive",
      });
      return;
    }
    
    const updates = {
      examination_status: 'completed' as const,
      notes: notes.trim() || null
    };
    
    try {
      console.log('[ExaminationSummary] Completing examination with updates:', updates);
      await onSave(updates);

      // Assign the entry to the selected optician using mutation hook
      console.log('[ExaminationSummary] Assigning entry to optician:', selectedOpticianId);
      await assignOptician(selectedOpticianId);

      // Send email notification to the optician
      console.log('[ExaminationSummary] Sending email notification to optician');
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'notify-optician-driving-license',
          {
            body: {
              entryId: entry.id,
              opticianEmail: selectedOptician.email,
              appUrl: window.location.origin
            }
          }
        );

        if (emailError) {
          console.error('[ExaminationSummary] Email notification failed:', emailError);
          // Don't fail the whole process for email errors, just log it
        } else {
          if (emailResult && emailResult.success === false) {
            toast({
              title: 'E-post kunde inte skickas',
              description: emailResult.hint || 'Verifiera avsändardomänen i Resend och sätt RESEND_FROM.',
            });
          }
        }
      } catch (emailErr) {
        console.error('[ExaminationSummary] Email notification error:', emailErr);
        // Don't fail the whole process for email errors
      }

      toast({
        title: "Undersökning slutförd",
        description: `Körkortsundersökningen har slutförts och tilldelats ${getOpticianDisplayName(opticians.find(o => o.clerk_user_id === selectedOpticianId))} för beslut.`
      });
      
      // Only close dialog after successful save and assignment
      onComplete();
    } catch (error: any) {
      console.error('[ExaminationSummary] Error completing examination:', error);
      toast({
        title: "Kunde inte slutföra",
        description: `Fel vid sparning: ${error.message || 'Okänt fel'}. Försök igen.`,
        variant: "destructive"
      });
      // Don't close dialog on error
    }
  };
  const isCompleted = examination?.examination_status === 'completed';
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sammanfattning
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
          </h4>
          <div className="grid grid-cols-1 gap-4 text-sm">
            {(examination?.uses_glasses || examination?.uses_contact_lenses) ? (
              <>
                {/* With correction values */}
                <div className="space-y-1">
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    Med korrektion
                    <Badge variant="secondary" className="text-xs">
                      {examination?.uses_glasses && examination?.uses_contact_lenses ? 'Glasögon + linser' : 
                       examination?.uses_glasses ? 'Glasögon' : 'Linser'}
                    </Badge>
                  </h5>
                  <p>Båda ögon: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_both)}
                  </span></p>
                  <p>Höger öga: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_right)}
                  </span></p>
                  <p>Vänster öga: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_left)}
                  </span></p>
                </div>
                
                {/* Without correction values */}
                <div className="space-y-1">
                  <h5 className="font-medium text-sm">Utan korrektion</h5>
                  <p>Båda ögon: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_both_eyes)}
                  </span></p>
                  <p>Höger öga: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_right_eye)}
                  </span></p>
                  <p>Vänster öga: <span className="font-mono">
                    {formatVisualAcuityDisplay(examination?.visual_acuity_left_eye)}
                  </span></p>
                </div>
              </>
            ) : (
              /* Without correction only */
              <div className="space-y-1">
                <h5 className="font-medium text-sm">Utan korrektion</h5>
                <p>Båda ögon: <span className="font-mono">
                  {formatVisualAcuityDisplay(examination?.visual_acuity_both_eyes)}
                </span></p>
                <p>Höger öga: <span className="font-mono">
                  {formatVisualAcuityDisplay(examination?.visual_acuity_right_eye)}
                </span></p>
                <p>Vänster öga: <span className="font-mono">
                  {formatVisualAcuityDisplay(examination?.visual_acuity_left_eye)}
                </span></p>
              </div>
            )}
          </div>
          
          {examination?.vision_below_limit ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Visusvärden är under gränsvärdet för körkort
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Visusvärden uppfyller kraven för körkort
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Glasses prescription display for higher licenses */}
        {(examination?.uses_glasses || examination?.uses_contact_lenses) && 
         (examination?.glasses_prescription_od_sph || examination?.glasses_prescription_os_sph) && (
          <div className="space-y-3">
            <h4 className="font-medium">Glasögonstyrkor</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Right eye (OD) */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Höger öga (OD)</h5>
                <div className="space-y-1">
                  {examination?.glasses_prescription_od_sph && (
                    <p>Sfär: <span className="font-mono">{examination.glasses_prescription_od_sph}</span></p>
                  )}
                  {examination?.glasses_prescription_od_cyl && (
                    <p>Cylinder: <span className="font-mono">{examination.glasses_prescription_od_cyl}</span></p>
                  )}
                  {examination?.glasses_prescription_od_axis && (
                    <p>Axel: <span className="font-mono">{examination.glasses_prescription_od_axis}°</span></p>
                  )}
                  {examination?.glasses_prescription_od_add && (
                    <p>Addition: <span className="font-mono">{examination.glasses_prescription_od_add}</span></p>
                  )}
                </div>
              </div>

              {/* Left eye (OS) */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Vänster öga (OS)</h5>
                <div className="space-y-1">
                  {examination?.glasses_prescription_os_sph && (
                    <p>Sfär: <span className="font-mono">{examination.glasses_prescription_os_sph}</span></p>
                  )}
                  {examination?.glasses_prescription_os_cyl && (
                    <p>Cylinder: <span className="font-mono">{examination.glasses_prescription_os_cyl}</span></p>
                  )}
                  {examination?.glasses_prescription_os_axis && (
                    <p>Axel: <span className="font-mono">{examination.glasses_prescription_os_axis}°</span></p>
                  )}
                  {examination?.glasses_prescription_os_add && (
                    <p>Addition: <span className="font-mono">{examination.glasses_prescription_os_add}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* ID verification summary */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <IdCard className="h-4 w-4" />
            Legitimationskontroll
          </h4>
          
          {idVerified ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>Legitimation verifierad</p>
                  <p className="text-xs text-muted-foreground">
                    Typ: {idType?.replace('_', ' ')} | Verifierad av: {resolveUserDisplay(verifiedBy)}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Legitimation ej verifierad
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Recommendation Engine */}
        <RecommendationEngine 
          examination={examination}
          entry={entry}
        />

        <Separator />

        <Separator />

        {/* Optician assignment section */}
        {!isCompleted && <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Tilldelning av ansvarig optiker
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="optician-select">Välj ansvarig optiker</Label>
              <Select 
                value={selectedOpticianId} 
                onValueChange={setSelectedOpticianId}
                disabled={loadingOpticians}
              >
                <SelectTrigger id="optician-select">
                  <SelectValue placeholder={loadingOpticians ? "Laddar optiker..." : "Välj optiker"} />
                </SelectTrigger>
                <SelectContent>
                  {opticians.map((optician) => (
                    <SelectItem key={optician.id} value={optician.clerk_user_id}>
                      {getOpticianDisplayName(optician)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedOpticianId && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Undersökningen kommer att tilldelas {getOpticianDisplayName(opticians.find(o => o.clerk_user_id === selectedOpticianId))} och ett e-postmeddelande skickas automatiskt.
                </AlertDescription>
              </Alert>
            )}
          </div>}

        <Separator />

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
              </div>
            </AlertDescription>
          </Alert> : <div className="flex justify-end gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onComplete} disabled={isSaving}>
                Avbryt
              </Button>
              <Button onClick={handleComplete} disabled={isSaving || !selectedOpticianId}>
                {isSaving ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isSaving ? "Slutför..." : "Slutför undersökning"}
              </Button>
            </div>
          </div>}
      </CardContent>
    </Card>;
};