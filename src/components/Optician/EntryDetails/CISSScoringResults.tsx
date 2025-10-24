/**
 * CISSScoringResults Component
 * Displays CISS scoring results with visual indicators for threshold status
 * and flagged questions requiring attention.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FlaggedQuestion {
  question_id: string;
  label: string;
  score: number;
  warning_message?: string;
}

interface ScoringResult {
  total_score: number;
  max_possible_score: number;
  percentage: number;
  threshold_exceeded: boolean;
  flagged_questions: FlaggedQuestion[];
}

interface CISSScoringResultsProps {
  scoringResult: ScoringResult;
  thresholdMessage?: string;
}

export const CISSScoringResults = ({ 
  scoringResult, 
  thresholdMessage 
}: CISSScoringResultsProps) => {
  const { 
    total_score, 
    max_possible_score, 
    percentage, 
    threshold_exceeded, 
    flagged_questions 
  } = scoringResult;

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: threshold_exceeded 
        ? 'hsl(var(--destructive))' 
        : 'hsl(var(--accent-teal))'
    }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          CISS Bedömningsresultat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Totalpoäng</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {total_score}
              </span>
              <span className="text-sm text-muted-foreground">
                / {max_possible_score}
              </span>
            </div>
          </div>
          
          <Progress 
            value={percentage} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
            {threshold_exceeded ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Tröskel överskriden
              </Badge>
            ) : (
              <Badge 
                className="flex items-center gap-1 bg-accent-teal/10 text-accent-teal border-accent-teal/20"
              >
                <CheckCircle className="h-3 w-3" />
                Under tröskel
              </Badge>
            )}
          </div>
        </div>

        {/* Threshold message */}
        {threshold_exceeded && thresholdMessage && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive mb-1">
                  Rekommendation
                </p>
                <p className="text-sm text-foreground">
                  {thresholdMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flagged questions */}
        {flagged_questions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Frågor som behöver uppmärksamhet ({flagged_questions.length})
            </h4>
            <div className="space-y-2">
              {flagged_questions.map((flagged, index) => (
                <div 
                  key={`${flagged.question_id}-${index}`}
                  className="p-3 rounded-md bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {flagged.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {flagged.score} poäng
                    </Badge>
                  </div>
                  {flagged.warning_message && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {flagged.warning_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary interpretation */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {threshold_exceeded ? (
              <>
                Bedömningen indikerar förhöjda besvär relaterade till skärmanvändning. 
                En komplett synundersökning rekommenderas för att utesluta synproblem 
                och ge råd om skärmergonomi.
              </>
            ) : (
              <>
                Bedömningen visar inga tecken på allvarliga besvär. 
                Fortsatt uppmärksamhet på skärmvanor och pauser rekommenderas.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
