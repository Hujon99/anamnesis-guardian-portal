/**
 * Component that provides a complete, copyable summary of driving license examination
 * formatted for external documents like Trafikverket submissions and driving license journals.
 * Combines AI summary, examination results, and optician decision in a structured format.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, FileText, Download, CheckCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

interface CopyableExaminationSummaryProps {
  examination: DrivingLicenseExamination;
  entry: AnamnesesEntry;
  answers: Record<string, any>;
}

export const CopyableExaminationSummary: React.FC<CopyableExaminationSummaryProps> = ({
  examination,
  entry,
  answers
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const formatForTrafikverket = () => {
    const date = new Date().toLocaleDateString('sv-SE');
    const examinationDate = entry.booking_date ? 
      new Date(entry.booking_date).toLocaleDateString('sv-SE') : date;
    
    const correctionType = examination.uses_glasses && examination.uses_contact_lenses ? 
      "glasögon och linser" : 
      examination.uses_glasses ? "glasögon" : 
      examination.uses_contact_lenses ? "linser" : "ingen";

    const decision = examination.optician_decision === 'approved' ? 'GODKÄND' :
      examination.optician_decision === 'requires_booking' ? 'KRÄVER YTTERLIGARE UNDERSÖKNING' :
      examination.optician_decision === 'not_approved' ? 'EJ GODKÄND' : 'UNDER BEDÖMNING';

    return `KÖRKORTSUNDERSÖKNING - TRAFIKVERKET

PATIENTINFORMATION:
Namn: ${entry.first_name || 'N/A'}
Undersökningsdatum: ${examinationDate}
Beslutsdatum: ${examination.optician_decision_date ? new Date(examination.optician_decision_date).toLocaleDateString('sv-SE') : 'Pågående'}

VISUSMÄTNINGAR:
Korrektion: ${correctionType}
Båda ögon: ${examination.visual_acuity_with_correction_both || examination.visual_acuity_both_eyes || 'Ej mätt'}
Höger öga: ${examination.visual_acuity_with_correction_right || examination.visual_acuity_right_eye || 'Ej mätt'}
Vänster öga: ${examination.visual_acuity_with_correction_left || examination.visual_acuity_left_eye || 'Ej mätt'}

LEGITIMATIONSKONTROLL:
Status: ${examination.id_verification_completed ? 'Verifierad' : 'Ej verifierad'}
Typ: ${examination.id_type?.replace('_', ' ') || 'N/A'}
Verifierad av: ${examination.verified_by || 'N/A'}

ANAMNES:
${entry.ai_summary || 'Ingen sammanfattning tillgänglig'}

SLUTLIGT BESLUT: ${decision}

${examination.optician_notes ? `OPTIKERANTECKNINGAR:\n${examination.optician_notes}` : ''}

Undersökning utförd enligt Transportstyrelsens föreskrifter.
Datum: ${date}`;
  };

  const formatForJournal = () => {
    const date = new Date().toLocaleDateString('sv-SE');
    const correctionType = examination.uses_glasses && examination.uses_contact_lenses ? 
      "glasögon+linser" : 
      examination.uses_glasses ? "glasögon" : 
      examination.uses_contact_lenses ? "linser" : "ingen";

    const decision = examination.optician_decision === 'approved' ? 'Godkänd' :
      examination.optician_decision === 'requires_booking' ? 'Bokning krävs' :  
      examination.optician_decision === 'not_approved' ? 'Ej godkänd' : 'Under bedömning';

    return `KÖRKORTSUNDERSÖKNING ${date}

Patient: ${entry.first_name || 'N/A'}
Visus med ${correctionType}: ${examination.visual_acuity_with_correction_both || examination.visual_acuity_both_eyes || 'N/A'}
ID verifierad: ${examination.id_verification_completed ? 'Ja' : 'Nej'}
Beslut: ${decision}

Anamnes: ${entry.ai_summary || 'Ingen sammanfattning'}

${examination.optician_notes ? `Anteckningar: ${examination.optician_notes}` : ''}`;
  };

  const formatRawData = () => {
    return JSON.stringify({
      patient: {
        name: entry.first_name,
        examination_date: entry.booking_date,
        decision_date: examination.optician_decision_date
      },
      visual_acuity: {
        both_eyes: examination.visual_acuity_both_eyes,
        right_eye: examination.visual_acuity_right_eye,
        left_eye: examination.visual_acuity_left_eye,
        with_correction_both: examination.visual_acuity_with_correction_both,
        with_correction_right: examination.visual_acuity_with_correction_right,
        with_correction_left: examination.visual_acuity_with_correction_left,
        uses_glasses: examination.uses_glasses,
        uses_contact_lenses: examination.uses_contact_lenses
      },
      id_verification: {
        completed: examination.id_verification_completed,
        type: examination.id_type,
        verified_by: examination.verified_by
      },
      decision: {
        result: examination.optician_decision,
        date: examination.optician_decision_date,
        decided_by: examination.decided_by,
        notes: examination.optician_notes
      },
      ai_summary: entry.ai_summary,
      answers: answers
    }, null, 2);
  };

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      toast({
        title: "Kopierat!",
        description: `${format} har kopierats till urklipp.`
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (error) {
      toast({
        title: "Kunde inte kopiera",
        description: "Försök igen eller kopiera manuellt.",
        variant: "destructive"
      });
    }
  };

  const downloadAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportera undersökning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {/* Trafikverket format */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Trafikverket-format</h4>
              <Badge variant="secondary">Officiellt</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Strukturerat format för Trafikverkets handlingar
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(formatForTrafikverket(), 'Trafikverket-format')}
                className="flex items-center gap-2"
              >
                {copiedFormat === 'Trafikverket-format' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Kopiera
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadAsFile(
                  formatForTrafikverket(), 
                  `korkortsunderskning-trafikverket-${new Date().toISOString().split('T')[0]}.txt`
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Ladda ner
              </Button>
            </div>
          </div>

          <Separator />

          {/* Journal format */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Journalformat</h4>
              <Badge variant="secondary">Kompakt</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Kortfattat format för patientjournal
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(formatForJournal(), 'Journalformat')}
                className="flex items-center gap-2"
              >
                {copiedFormat === 'Journalformat' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Kopiera
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadAsFile(
                  formatForJournal(), 
                  `korkortsunderskning-journal-${new Date().toISOString().split('T')[0]}.txt`
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Ladda ner
              </Button>
            </div>
          </div>

          <Separator />

          {/* Raw data format */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Rådata (JSON)</h4>
              <Badge variant="secondary">Teknisk</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Komplett data i JSON-format för teknisk användning
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(formatRawData(), 'Rådata')}
                className="flex items-center gap-2"
              >
                {copiedFormat === 'Rådata' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Kopiera
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadAsFile(
                  formatRawData(), 
                  `korkortsunderskning-data-${new Date().toISOString().split('T')[0]}.json`
                )}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Ladda ner
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};