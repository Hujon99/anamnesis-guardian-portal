/**
 * Displays the patient's form answers for driving license examination.
 * Shows a summary of all responses and automatically flags answers 
 * that may require further investigation according to driving license requirements.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";

interface FormAnswersDisplayProps {
  entry: AnamnesesEntry;
  onNext: () => void;
}

export const FormAnswersDisplay: React.FC<FormAnswersDisplayProps> = ({
  entry,
  onNext
}) => {
  const answers = entry.answers as Record<string, any> || {};
  const hasAnswers = Object.keys(answers).length > 0;

  // Questions that typically require investigation for driving licenses
  const concerningAnswers = [
    { key: 'diabetes', label: 'Diabetes', value: answers.diabetes },
    { key: 'eye_disease', label: 'Ögonsjukdom', value: answers.eye_disease },
    { key: 'heart_condition', label: 'Hjärtproblem', value: answers.heart_condition },
    { key: 'epilepsy', label: 'Epilepsi', value: answers.epilepsy },
    { key: 'vision_problems', label: 'Synproblem', value: answers.vision_problems },
    { key: 'double_vision', label: 'Dubbelseende', value: answers.double_vision },
    { key: 'night_blindness', label: 'Nattblindhet', value: answers.night_blindness },
    { key: 'color_blindness', label: 'Färgblindhet', value: answers.color_blindness },
    { key: 'medications', label: 'Mediciner som påverkar syn', value: answers.medications }
  ].filter(item => item.value === true || item.value === 'ja' || item.value === 'yes');

  const renderAnswerValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nej';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || 'Ej besvarat');
  };

  if (!hasAnswers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulär
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Kunden har inte fyllt i formuläret än. Du kan skapa ett nytt formulär eller fortsätta med undersökningen.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Skapa nytt formulär
            </Button>
            <Button onClick={onNext}>
              Fortsätt utan formulär
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Formuläröversikt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Formulärstatus:</span>
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Komplett
          </Badge>
        </div>

        {/* Concerning answers alert */}
        {concerningAnswers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Flaggade svar som kräver uppmärksamhet:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {concerningAnswers.map((item, index) => (
                    <li key={index}>
                      {item.label}: {renderAnswerValue(item.value)}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* All answers display */}
        <div className="space-y-4">
          <h4 className="font-medium">Alla svar</h4>
          <div className="grid gap-3">
            {Object.entries(answers).map(([key, value]) => (
              <div 
                key={key} 
                className={`flex justify-between items-start p-3 rounded-lg border ${
                  concerningAnswers.some(item => item.key === key) 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-border bg-background'
                }`}
              >
                <span className="text-sm font-medium capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="text-sm text-right max-w-xs">
                  {renderAnswerValue(value)}
                  {concerningAnswers.some(item => item.key === key) && (
                    <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {concerningAnswers.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {concerningAnswers.length} svar kräver extra uppmärksamhet under undersökningen. 
              Kontrollera dessa punkter noggrant vid visusmätning.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Inga svar som direkt flaggar för körkortsundersökning. Fortsätt med visusmätning.
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Fortsätt till visusmätning
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};