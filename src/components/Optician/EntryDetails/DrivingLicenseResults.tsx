/**
 * This component displays completed driving license examination results
 * in the entry details modal. It shows a summary of the examination
 * results including visual acuity measurements, ID verification, and final decision.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Eye, IdCard, Car, Calendar, Clock, FileText, Sparkles } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnamnesesEntry } from "@/types/anamnesis";
import { DrivingLicenseOpticianDecision } from "./DrivingLicenseOpticianDecision";
import { CopyableExaminationSummary } from "./CopyableExaminationSummary";
import { RecommendationEngine } from "../DrivingLicense/RecommendationEngine";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useUser } from "@clerk/clerk-react";
import { useOpticians } from "@/hooks/useOpticians";
import { toast } from "@/hooks/use-toast";
import { useUserResolver } from "@/utils/userDisplayUtils";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface DrivingLicenseResultsProps {
  examination: DrivingLicenseExamination;
  entry: AnamnesesEntry;
  answers: Record<string, any>;
  onDecisionUpdate?: () => void;
  onStatusUpdate?: (status: string) => Promise<void>;
}

export const DrivingLicenseResults: React.FC<DrivingLicenseResultsProps> = ({
  examination,
  entry,
  answers,
  onDecisionUpdate,
  onStatusUpdate
}) => {
  const { user } = useUser();
  const { supabase } = useSupabaseClient();
  const { opticians = [] } = useOpticians();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const { resolveUserDisplay } = useUserResolver();
  const getDecisionBadge = () => {
    if (examination.optician_decision === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Godkänd
        </Badge>
      );
    } else if (examination.optician_decision === 'requires_booking') {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Calendar className="h-3 w-3 mr-1" />
          Bokning krävs
        </Badge>
      );
    } else if (examination.optician_decision === 'not_approved') {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Ej godkänd
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Väntar på beslut
        </Badge>
      );
    }
  };

  const getCorrectionType = () => {
    if (examination.uses_glasses && examination.uses_contact_lenses) {
      return "glasögon och linser";
    } else if (examination.uses_glasses) {
      return "glasögon";
    } else if (examination.uses_contact_lenses) {
      return "linser";
    }
    return null;
  };

  const correctionType = getCorrectionType();

  const getIdTypeInSwedish = (idType: string | null) => {
    if (!idType) return '';
    
    const translations: Record<string, string> = {
      'passport': 'Pass',
      'driving_license': 'Körkort', 
      'national_id': 'Nationellt ID',
      'eu_id': 'EU-ID',
      'other': 'Annat',
      'swedish_license': 'Svenskt körkort',
      'id_card': 'ID-kort'
    };
    
    return translations[idType] || idType.replace('_', ' ');
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Okänd användare';
    const optician = opticians.find(opt => opt.clerk_user_id === userId);
    return optician ? `${optician.first_name || ''} ${optician.last_name || ''}`.trim() || optician.display_name || 'Okänd användare' : 'Okänd användare';
  };

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          entryId: entry.id
        }
      });

      if (error) throw error;

      toast({
        title: "AI-sammanfattning genererad",
        description: "Sammanfattningen har skapats och sparats."
      });

      onDecisionUpdate?.();
    } catch (error: any) {
      console.error('Error generating AI summary:', error);
      toast({
        title: "Kunde inte generera sammanfattning",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Körkortsundersökning - Resultat
            {getDecisionBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient info */}
          <div className="space-y-2">
            <h4 className="font-medium">Patientinformation</h4>
            <div className="text-sm space-y-1">
              <p>Namn: {entry.first_name}</p>
              <p>Datum: {entry.booking_date ? new Date(entry.booking_date).toLocaleDateString('sv-SE') : 'Idag'}</p>
              <p>Slutförd: {new Date(examination.updated_at).toLocaleString('sv-SE')}</p>
            </div>
          </div>

          <Separator />

          {/* AI Summary */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              AI-sammanfattning av anamnes
            </h4>
            
            {entry.ai_summary ? (
              <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                {entry.ai_summary}
              </div>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Ingen AI-sammanfattning har genererats ännu för denna anamnes.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={generateAISummary}
                  disabled={isGeneratingSummary}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingSummary ? "Genererar..." : "Generera AI-sammanfattning"}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Visual acuity summary */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visusmätningar
            </h4>
            <div className="grid grid-cols-1 gap-4 text-sm">
              {correctionType ? (
                <>
                  {/* With correction values */}
                  <div className="space-y-1">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      Med korrektion
                      <Badge variant="secondary" className="text-xs">
                        {correctionType}
                      </Badge>
                    </h5>
                    <p>
                      Båda ögon: <span className="font-mono">
                        {examination.visual_acuity_with_correction_both || 'Ej mätt'}
                      </span>
                    </p>
                    <p>
                      Höger öga: <span className="font-mono">
                        {examination.visual_acuity_with_correction_right || 'Ej mätt'}
                      </span>
                    </p>
                    <p>
                      Vänster öga: <span className="font-mono">
                        {examination.visual_acuity_with_correction_left || 'Ej mätt'}
                      </span>
                    </p>
                  </div>
                  
                  {/* Without correction values */}
                  <div className="space-y-1">
                    <h5 className="font-medium text-sm">Utan korrektion</h5>
                    <p>
                      Båda ögon: <span className="font-mono">
                        {examination.visual_acuity_both_eyes || 'Ej mätt'}
                      </span>
                    </p>
                    <p>
                      Höger öga: <span className="font-mono">
                        {examination.visual_acuity_right_eye || 'Ej mätt'}
                      </span>
                    </p>
                    <p>
                      Vänster öga: <span className="font-mono">
                        {examination.visual_acuity_left_eye || 'Ej mätt'}
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                /* Without correction only */
                <div className="space-y-1">
                  <h5 className="font-medium text-sm">Utan korrektion</h5>
                  <p>
                    Båda ögon: <span className="font-mono">
                      {examination.visual_acuity_both_eyes || 'Ej mätt'}
                    </span>
                  </p>
                  <p>
                    Höger öga: <span className="font-mono">
                      {examination.visual_acuity_right_eye || 'Ej mätt'}
                    </span>
                  </p>
                  <p>
                    Vänster öga: <span className="font-mono">
                      {examination.visual_acuity_left_eye || 'Ej mätt'}
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            {examination.vision_below_limit ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
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

          <Separator />

          {/* ID verification summary */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <IdCard className="h-4 w-4" />
              Legitimationskontroll
            </h4>
            
            {entry.id_verification_completed ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Legitimation verifierad</p>
                    <div className="text-sm space-y-1">
                      <p>Typ: <span className="font-medium">{getIdTypeInSwedish(entry.id_type)}</span></p>
                      <p>Verifierad av: <span className="font-medium">{resolveUserDisplay(entry.verified_by)}</span></p>
                      {entry.personal_number && (
                        <p>Personnummer: <span className="font-mono font-medium">{entry.personal_number}</span></p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {entry.verified_at && `Verifierad: ${new Date(entry.verified_at).toLocaleString('sv-SE')}`}
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Legitimation ej verifierad
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          {examination.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Anteckningar</h4>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {examination.notes}
                </p>
              </div>
            </>
          )}

          {/* Final status */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Undersökning slutförd {new Date(examination.updated_at).toLocaleString('sv-SE')}</span>
                {getDecisionBadge()}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Recommendation Engine */}
      <div className="mt-6">
        <RecommendationEngine 
          examination={examination}
          entry={entry}
        />
      </div>

      {/* Optician Decision */}
      <div className="mt-6">
        <DrivingLicenseOpticianDecision
          examination={examination}
          entry={entry}
          currentUserId={user?.id || ''}
          onDecisionMade={onDecisionUpdate}
          getUserName={getUserName}
        />
      </div>

      {/* Export Section */}
      {examination.optician_decision && (
        <div className="mt-6">
          <CopyableExaminationSummary
            examination={examination}
            entry={entry}
            answers={answers}
            onStatusUpdate={onStatusUpdate}
          />
        </div>
      )}
    </div>
  );
};