/**
 * Component for displaying real-time scoring information for CISS and other scoring-enabled forms.
 * Shows total score, flagged questions, and threshold alerts.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScoringDisplayProps {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  thresholdExceeded: boolean;
  flaggedQuestions: Array<{
    question_id: string;
    label: string;
    score: number;
    warning_message?: string;
  }>;
  thresholdMessage?: string;
  showToPatient: boolean;
}

export const ScoringDisplay: React.FC<ScoringDisplayProps> = ({
  totalScore,
  maxPossibleScore,
  percentage,
  thresholdExceeded,
  flaggedQuestions,
  thresholdMessage,
  showToPatient,
}) => {
  if (!showToPatient) {
    return null;
  }

  return (
    <Card className="border-accent_teal/20 bg-surface_light/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {thresholdExceeded ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle className="h-5 w-5 text-accent_teal" />
          )}
          Resultat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Score */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background/80 border border-border">
          <span className="text-sm font-medium text-muted-foreground">Total poäng</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totalScore}
            </span>
            <span className="text-lg text-muted-foreground">/ {maxPossibleScore}</span>
            <Badge 
              variant={thresholdExceeded ? "destructive" : "secondary"}
              className="ml-2"
            >
              {percentage}%
            </Badge>
          </div>
        </div>

        {/* Threshold Alert */}
        {thresholdExceeded && thresholdMessage && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Observera</AlertTitle>
            <AlertDescription>{thresholdMessage}</AlertDescription>
          </Alert>
        )}

        {/* Flagged Questions */}
        {flaggedQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent_coral" />
              Frågor som kräver uppmärksamhet
            </h4>
            <div className="space-y-2">
              {flaggedQuestions.map((question) => (
                <div
                  key={question.question_id}
                  className="p-3 rounded-lg bg-accent_coral/5 border border-accent_coral/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-foreground flex-1">
                      {question.label}
                    </span>
                    <Badge variant="outline" className="border-accent_coral text-accent_coral shrink-0">
                      {question.score} poäng
                    </Badge>
                  </div>
                  {question.warning_message && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {question.warning_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
