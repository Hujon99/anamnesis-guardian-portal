/**
 * Component for displaying warnings and guidance during driving license examinations.
 * Analyzes visual acuity measurements and form answers to provide automated warnings
 * and recommendations for next steps in the examination process.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Calendar, Info } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";

interface WarningsDisplayProps {
  examination: any;
  entry: AnamnesesEntry;
  onNext: () => void;
}

export const WarningsDisplay: React.FC<WarningsDisplayProps> = ({
  examination,
  entry,
  onNext
}) => {
  const warnings: { type: 'error' | 'warning' | 'info'; title: string; message: string; action?: string }[] = [];
  
  // Vision-based warnings
  if (examination.vision_below_limit) {
    warnings.push({
      type: 'error',
      title: 'Visus under gräns',
      message: 'En eller flera visusmätningar är under det krav som ställs för körkort. Kunden behöver bokas för vidare undersökning hos optiker.',
      action: 'Boka undersökning'
    });
  }

  // Form-based warnings
  const answers = entry.answers as Record<string, any> || {};
  const concerningConditions = [
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'eye_disease', label: 'Ögonsjukdom' },
    { key: 'epilepsy', label: 'Epilepsi' },
    { key: 'heart_condition', label: 'Hjärtproblem' },
    { key: 'double_vision', label: 'Dubbelseende' },
    { key: 'night_blindness', label: 'Nattblindhet' }
  ];

  const flaggedConditions = concerningConditions.filter(condition => 
    answers[condition.key] === true || answers[condition.key] === 'ja'
  );

  if (flaggedConditions.length > 0) {
    warnings.push({
      type: 'warning',
      title: 'Medicinska tillstånd upptäckta',
      message: `Kunden har angett följande tillstånd: ${flaggedConditions.map(c => c.label).join(', ')}. Detta kan kräva läkarintyg eller vidare utredning.`,
      action: 'Kontrollera krav'
    });
  }

  // Age-related warnings
  const bookingDate = entry.booking_date ? new Date(entry.booking_date) : new Date();
  const currentYear = bookingDate.getFullYear();
  
  // Note: In a real system, you'd calculate age from birth date
  // This is a placeholder for age-based requirements
  warnings.push({
    type: 'info',
    title: 'Åldersrelaterade krav',
    message: 'Kontrollera om kunden uppfyller ålderskrav för den typ av körkort som söks. Vissa kategorier har specifika krav på syn och hälsa.',
  });

  // Correction requirements
  if (examination.uses_glasses || examination.uses_contact_lenses) {
    warnings.push({
      type: 'info',
      title: 'Korrektion krävs',
      message: `Kunden använder ${examination.uses_glasses ? 'glasögon' : 'kontaktlinser'}. Detta kommer att noteras på körkortet med kod 01 (glasögon) eller 02 (kontaktlinser).`
    });
  }

  const hasErrors = warnings.some(w => w.type === 'error');
  const hasWarnings = warnings.some(w => w.type === 'warning');

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Varningar och guidning
          {warnings.length > 0 && (
            <Badge variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'}>
              {warnings.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {warnings.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Inga varningar upptäckta. Undersökningen kan fortsätta enligt normal rutin.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {warnings.map((warning, index) => {
              const Icon = getIcon(warning.type);
              return (
                <Alert key={index} variant={getAlertVariant(warning.type)}>
                  <Icon className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{warning.title}</p>
                      <p className="text-sm">{warning.message}</p>
                      {warning.action && (
                        <Button variant="outline" size="sm" className="mt-2">
                          {warning.action}
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}

        {/* Guidance section */}
        <div className="space-y-3">
          <h4 className="font-medium">Nästa steg</h4>
          
          {hasErrors ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Undersökningen kan inte godkännas</p>
                  <p className="text-sm">
                    På grund av visusvärden under gräns behöver kunden boka tid för fullständig synundersökning 
                    hos legitimerad optiker innan körkort kan utfärdas.
                  </p>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Boka undersökning
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : hasWarnings ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Fortsätt med försiktighet</p>
                  <p className="text-sm">
                    Det finns flaggade tillstånd som kan kräva ytterligare dokumentation. 
                    Kontrollera Transportstyrelsens krav för aktuella medicinska tillstånd.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Undersökningen kan fortsätta. Gå vidare till sammanfattning.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Fortsätt till sammanfattning
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};