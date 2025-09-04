/**
 * Automated recommendation engine for driving license examinations.
 * Analyzes examination results and patient answers to provide automated
 * recommendations for next steps: vision examination or optician assessment.
 * 
 * Recommendation Logic:
 * - Visual acuity < 1.0 → Recommend vision examination
 * - Double vision or night vision problems → Recommend vision examination  
 * - Other conditions (medicine, eye disease, surgery) → Optician assessment
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Stethoscope,
  Activity
} from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";

interface RecommendationEngineProps {
  examination: any;
  entry: AnamnesesEntry;
}

interface Recommendation {
  type: 'vision_exam' | 'optician_assessment' | 'approved';
  title: string;
  description: string;
  reasons: string[];
  priority: 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
}

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  examination,
  entry
}) => {
  const getRecommendation = (): Recommendation => {
    const answers = entry.answers as Record<string, any> || {};
    const reasons: string[] = [];
    
    // Check visual acuity - prioritize corrected vision if glasses/contacts are used
    const useCorrection = examination?.uses_glasses || examination?.uses_contact_lenses;
    const primaryVisus = useCorrection 
      ? (examination?.visual_acuity_with_correction_both || examination?.visual_acuity_both_eyes)
      : examination?.visual_acuity_both_eyes;
    
    // Convert comma to dot for parsing (Swedish number format)
    const visusValue = primaryVisus ? parseFloat(String(primaryVisus).replace(',', '.')) : null;
    
    // Rule 1: Visual acuity < 1.0 → Vision examination
    if (visusValue && visusValue < 1.0) {
      reasons.push(`Visus ${visusValue.toString().replace('.', ',')} är under gränsvärdet 1,0`);
    }
    
    // Rule 2: Double vision → Vision examination
    if (answers.dubbelseende === "Ja") {
      reasons.push("Dubbelseende rapporterat");
    }
    
    // Rule 3: Night vision problems → Vision examination  
    if (answers.andra_besvär_typ === "Problem med mörkerseendet") {
      reasons.push("Problem med mörkerseende");
    }
    
    // If any vision-related issues found, recommend vision exam
    if (reasons.length > 0) {
      return {
        type: 'vision_exam',
        title: 'Rekommenderar synundersökning',
        description: 'Baserat på undersökningsresultaten rekommenderas en fullständig synundersökning hos legitimerad optiker.',
        reasons,
        priority: 'high',
        icon: Eye
      };
    }
    
    // Rule 4: Other medical conditions → Optician assessment
    const additionalReasons: string[] = [];
    
    if (answers.mediciner === "Ja") {
      additionalReasons.push("Tar mediciner");
    }
    
    if (answers.ögonsjukdomar_konstaterade === "Ja") {
      additionalReasons.push("Konstaterade ögonsjukdomar");
    }
    
    if (answers.ögonoperation_genomgått === "Ja") {
      additionalReasons.push("Genomgått ögonoperation");
    }
    
    // Check for other concerning conditions
    if (answers.diabetes === "Ja" || answers.diabetes === true) {
      additionalReasons.push("Diabetes");
    }
    
    if (answers.hjärtproblem === "Ja" || answers.hjärtproblem === true) {
      additionalReasons.push("Hjärtproblem");
    }
    
    if (answers.epilepsi === "Ja" || answers.epilepsi === true) {
      additionalReasons.push("Epilepsi");
    }
    
    // If medical conditions found, recommend optician assessment
    if (additionalReasons.length > 0) {
      return {
        type: 'optician_assessment',
        title: 'Skicka till optiker för bedömning',
        description: 'Medicinska tillstånd eller tidigare behandlingar kräver professionell bedömning av legitimerad optiker.',
        reasons: additionalReasons,
        priority: 'medium',
        icon: UserCheck
      };
    }
    
    // No issues found - can be approved
    return {
      type: 'approved',
      title: 'Kan godkännas',
      description: 'Inga medicinska eller tekniska hinder för körkortsgodkännande identifierade.',
      reasons: ['Inga avvikelser funna'],
      priority: 'low',
      icon: CheckCircle
    };
  };

  const recommendation = getRecommendation();

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'vision_exam': return 'destructive';
      case 'optician_assessment': return 'secondary';
      case 'approved': return 'default';
      default: return 'default';
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'vision_exam': return 'destructive';
      case 'optician_assessment': return 'default';
      case 'approved': return 'default';
      default: return 'default';
    }
  };

  const RecommendationIcon = recommendation.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Automatisk rekommendation
          <Badge variant={getBadgeVariant(recommendation.type)}>
            {recommendation.priority === 'high' ? 'Hög prioritet' : 
             recommendation.priority === 'medium' ? 'Medium prioritet' : 'Låg prioritet'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={getAlertVariant(recommendation.type)}>
          <RecommendationIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{recommendation.title}</p>
                <p className="text-sm mt-1">{recommendation.description}</p>
              </div>
              
              {recommendation.reasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Identifierade faktorer:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {recommendation.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {recommendation.type === 'vision_exam' && (
                <div className="flex items-center gap-2 pt-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Åtgärd: Boka fullständig synundersökning</span>
                </div>
              )}
              
              {recommendation.type === 'optician_assessment' && (
                <div className="flex items-center gap-2 pt-2">
                  <Stethoscope className="h-4 w-4" />
                  <span className="text-sm font-medium">Åtgärd: Konsultera legitimerad optiker</span>
                </div>
              )}
              
              {recommendation.type === 'approved' && (
                <div className="flex items-center gap-2 pt-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Åtgärd: Kan fortsätta med normal process</span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Technical details for optician */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Teknisk information:</strong></p>
          <p>• Visusvärde: {examination?.visual_acuity_both_eyes || 'Ej mätt'}</p>
          {(examination?.uses_glasses || examination?.uses_contact_lenses) && (
            <p>• Visus med korrektion: {examination?.visual_acuity_with_correction_both || 'Ej mätt'}</p>
          )}
          <p>• Rekommendationsmotor version: 1.0</p>
        </div>
      </CardContent>
    </Card>
  );
};