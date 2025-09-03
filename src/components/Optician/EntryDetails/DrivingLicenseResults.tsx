/**
 * This component displays completed driving license examination results
 * in the entry details modal. It shows a summary of the examination
 * results including visual acuity measurements, ID verification, and final decision.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Eye, IdCard, Car, Calendar, Clock } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnamnesesEntry } from "@/types/anamnesis";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface DrivingLicenseResultsProps {
  examination: DrivingLicenseExamination;
  entry: AnamnesesEntry;
}

export const DrivingLicenseResults: React.FC<DrivingLicenseResultsProps> = ({
  examination,
  entry
}) => {
  const getDecisionBadge = () => {
    if (examination.passed_examination) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Godkänd
        </Badge>
      );
    } else if (examination.requires_optician_visit) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Calendar className="h-3 w-3 mr-1" />
          Bokning krävs
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Ej godkänd
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
      'other': 'Annat'
    };
    
    return translations[idType] || idType.replace('_', ' ');
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

          {/* Visual acuity summary */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visusmätningar
              {correctionType && (
                <Badge variant="secondary" className="text-xs">
                  Med {correctionType}
                </Badge>
              )}
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p>
                Båda ögon: <span className="font-mono">
                  {correctionType ? 
                    examination.visual_acuity_with_correction_both || examination.visual_acuity_both_eyes || 'Ej mätt' : 
                    examination.visual_acuity_both_eyes || 'Ej mätt'
                  }
                </span>
              </p>
              <p>
                Höger öga: <span className="font-mono">
                  {correctionType ? 
                    examination.visual_acuity_with_correction_right || examination.visual_acuity_right_eye || 'Ej mätt' : 
                    examination.visual_acuity_right_eye || 'Ej mätt'
                  }
                </span>
              </p>
              <p>
                Vänster öga: <span className="font-mono">
                  {correctionType ? 
                    examination.visual_acuity_with_correction_left || examination.visual_acuity_left_eye || 'Ej mätt' : 
                    examination.visual_acuity_left_eye || 'Ej mätt'
                  }
                </span>
              </p>
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
            
            {examination.id_verification_completed ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Legitimation verifierad</p>
                    <p className="text-xs text-muted-foreground">
                      Typ: {getIdTypeInSwedish(examination.id_type)} | Verifierad av: {examination.verified_by}
                    </p>
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
    </div>
  );
};