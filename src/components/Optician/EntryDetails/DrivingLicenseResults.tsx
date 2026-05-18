/**
 * DrivingLicenseResults
 *
 * Pedagogisk återblicksvy för en redan slutförd körkortskoll. Visas i
 * entry-detail-modalen (`ModalTabContent`) när optikern/assistenten öppnar
 * en gammal undersökning inom 7-dagars retention.
 *
 * Vyn är medvetet ren: ingen rådata-flod, inga åtgärdsknappar för flödet.
 * Innehåll:
 *  1. Status-banner — bedömning + journalmetod (ServeIT eller appen) + datum
 *  2. Sammanfattning av undersökningen (visus, korrektion, anamnessvar)
 *  3. "Vad gjordes/ska göras" — om journalförd i ServeIT renderas samma
 *     pedagogiska 7-stegsguide som i flödets sista steg (read-only via
 *     `ServeitInstructions` mode="review"). Om journalförd direkt i appen
 *     visas en bekräftelse + AI-sammanfattning.
 *  4. Valfri collapsible "Tekniska detaljer" med glasstyrkor för optikerns
 *     referens.
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  XCircle,
  Eye,
  IdCard,
  Car,
  Calendar,
  Clock,
  FileText,
  ChevronDown,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnamnesesEntry } from "@/types/anamnesis";
import { ServeitInstructions } from "../DrivingLicense/ServeitInstructions";
import { parseOutcomeFromNotes, getOutcomeLabel } from "../DrivingLicense/outcomeUtils";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useUserResolver } from "@/utils/userDisplayUtils";
import { formatVisualAcuityDisplay } from "@/lib/number-utils";
import { cn } from "@/lib/utils";

type DrivingLicenseExamination =
  Database["public"]["Tables"]["driving_license_examinations"]["Row"];

interface DrivingLicenseResultsProps {
  examination: DrivingLicenseExamination;
  entry: AnamnesesEntry;
  answers: Record<string, any>;
  onDecisionUpdate?: () => void;
  onStatusUpdate?: (status: string) => Promise<void>;
}

const ID_TYPE_LABELS: Record<string, string> = {
  swedish_license: "Körkort",
  swedish_id: "ID-kort",
  passport: "Pass",
  guardian_certificate: "Vårdnadshavares intyg",
};

const formatVisus = (value: any): string => {
  const f = formatVisualAcuityDisplay(value);
  if (!f || f === "-" || f === "—") return "—";
  return f;
};

const buildCorrectionLabel = (exam: DrivingLicenseExamination): string => {
  const parts: string[] = [];
  if (exam.uses_glasses) {
    parts.push(`Glasögon (${exam.prescription_over_8d ? "över ±8 D" : "under ±8 D"})`);
  }
  if (exam.uses_contact_lenses) parts.push("Kontaktlinser");
  return parts.length ? parts.join(" + ") : "Ingen korrektion";
};

export const DrivingLicenseResults: React.FC<DrivingLicenseResultsProps> = ({
  examination,
  entry,
}) => {
  const { opticians = [] } = useOpticians();
  const { resolveUserDisplay } = useUserResolver();
  const [showTechnical, setShowTechnical] = useState(false);

  const completionMethod = (examination.completion_method as "servit" | "app") || "app";
  const isServeit = completionMethod === "servit";
  const isCompleted = examination.examination_status === "completed";
  const outcome = parseOutcomeFromNotes(examination.notes || "").outcome;
  const outcomeLabel = outcome ? getOutcomeLabel(outcome) : null;
  const freeTextNotes = parseOutcomeFromNotes(examination.notes || "").rest;

  const opticianName = (() => {
    const id = entry.optician_id || examination.decided_by;
    if (!id) return null;
    const opt = opticians.find((o) => o.clerk_user_id === id);
    return opt ? getOpticianDisplayName(opt) : resolveUserDisplay(id);
  })();

  const examDateStr = new Date(
    examination.created_at || examination.updated_at,
  ).toLocaleDateString("sv-SE");
  const journaledAtStr = examination.updated_at
    ? new Date(examination.updated_at).toLocaleString("sv-SE")
    : "";

  const idType = entry.id_type || examination.id_type;
  const idLabel = idType ? ID_TYPE_LABELS[idType] || idType : "—";

  const correction = buildCorrectionLabel(examination);
  const hasCorrection = examination.uses_glasses || examination.uses_contact_lenses;

  // Indicates whether any meaningful examination data has been captured.
  const hasAnyExamData =
    examination.visual_acuity_right_eye !== null ||
    examination.visual_acuity_left_eye !== null ||
    examination.visual_acuity_both_eyes !== null ||
    !!examination.notes ||
    !!examination.uses_glasses ||
    !!examination.uses_contact_lenses ||
    !!entry.id_verification_completed;

  const hasGlassesRx =
    examination.glasses_prescription_od_sph !== null ||
    examination.glasses_prescription_os_sph !== null;

  // Outcome → badge style
  const outcomeBadge = () => {
    if (!outcomeLabel) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Ingen bedömning sparad
        </Badge>
      );
    }
    const isApproved = outcome?.startsWith("approved");
    const isNotApproved = outcome === "not_approved";
    return (
      <Badge
        className={cn(
          isApproved &&
            "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/30",
          isNotApproved &&
            "bg-destructive/15 text-destructive hover:bg-destructive/15 border-destructive/30",
          !isApproved && !isNotApproved &&
            "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 border-amber-500/30",
        )}
        variant="outline"
      >
        {isApproved ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : isNotApproved ? (
          <XCircle className="h-3 w-3 mr-1" />
        ) : (
          <Calendar className="h-3 w-3 mr-1" />
        )}
        {outcomeLabel}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Banner när undersökningen aldrig blev klar */}
      {!isCompleted && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Clock className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-sm space-y-1">
            <p className="font-semibold text-amber-800">
              Undersökningen är inte slutförd
            </p>
            <p>
              Körkortsundersökningen påbörjades men slutfördes aldrig — därför
              saknas en del värden nedan. Öppna körkortsflödet från listan för
              att fortsätta där du slutade.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* A. Status-banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5" />
            Körkortskoll — {entry.first_name || "patient"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {outcomeBadge()}
            <Badge
              variant="outline"
              className={cn(
                isServeit
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
              )}
            >
              {isServeit ? (
                <ClipboardCheck className="h-3 w-3 mr-1" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {isServeit ? "Ska journalföras i ServeIT" : "Journalförd i appen"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-sm">
            <p>
              <span className="text-muted-foreground">Datum: </span>
              {examDateStr}
            </p>
            <p>
              <span className="text-muted-foreground">Slutförd: </span>
              {journaledAtStr}
            </p>
            {opticianName && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Ansvarig optiker: </span>
                {opticianName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* B. Sammanfattning */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Sammanfattning av undersökningen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Legitimation */}
          <div className="flex items-start gap-3">
            <IdCard className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Legitimation</p>
              <p>
                {idLabel}
                {entry.id_verification_completed && (
                  <span className="text-emerald-700 ml-2">✓ verifierad</span>
                )}
                {entry.personal_number && (
                  <span className="font-mono ml-2">{entry.personal_number}</span>
                )}
              </p>
            </div>
          </div>

          <Separator />

          {/* Visus */}
          <div className="flex items-start gap-3">
            <Eye className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Synskärpa utan korrektion (H / V / B)
                </p>
                <p className="font-mono">
                  {formatVisus(examination.visual_acuity_right_eye)} /{" "}
                  {formatVisus(examination.visual_acuity_left_eye)} /{" "}
                  {formatVisus(examination.visual_acuity_both_eyes)}
                </p>
              </div>
              {hasCorrection && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Synskärpa med korrektion (H / V / B)
                  </p>
                  <p className="font-mono">
                    {formatVisus(examination.visual_acuity_with_correction_right)} /{" "}
                    {formatVisus(examination.visual_acuity_with_correction_left)} /{" "}
                    {formatVisus(examination.visual_acuity_with_correction_both)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Korrektion</p>
                <p>{correction}</p>
              </div>
              {examination.vision_below_limit ? (
                <Alert variant="destructive" className="py-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Visusvärden under gränsen för körkort.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="py-2 border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle className="h-4 w-4 text-emerald-700" />
                  <AlertDescription className="text-xs">
                    Visusvärden uppfyller kraven.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Optikerns anteckning */}
          {freeTextNotes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Anteckning från assistent
                </p>
                <p className="whitespace-pre-wrap bg-muted/50 rounded-md px-3 py-2">
                  {freeTextNotes}
                </p>
              </div>
            </>
          )}

          {/* AI-sammanfattning (om finns) */}
          {entry.ai_summary && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-sammanfattning av anamnes
                </p>
                <div className="whitespace-pre-wrap bg-muted/50 rounded-md px-3 py-2">
                  {entry.ai_summary}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* C. ServeIT-guide — visas alltid så att man kan gå tillbaka och hitta instruktionerna */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Så här journalför du den här i ServeIT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isServeit ? (
            <Alert className="border-primary/30 bg-primary/5">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Den här körkortskollen ska journalföras i ServeIT — så här gör du
                (eller så här gjordes det).
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle className="h-4 w-4 text-emerald-700" />
              <AlertDescription className="text-sm">
                Den här körkortskollen är redan journalförd direkt i appen
                {opticianName ? ` av ${opticianName}` : ""}
                {journaledAtStr ? ` den ${journaledAtStr}` : ""}. Guiden nedan
                finns kvar som referens om du vill journalföra den i ServeIT
                också.
              </AlertDescription>
            </Alert>
          )}
          <ServeitInstructions
            examination={examination}
            entry={entry}
            mode="review"
          />
        </CardContent>
      </Card>

      {/* D. Tekniska detaljer — collapsible, default stängd */}
      {hasGlassesRx && (
        <Collapsible open={showTechnical} onOpenChange={setShowTechnical}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs text-muted-foreground">
                Tekniska detaljer (glasstyrkor)
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showTechnical && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <h6 className="font-medium text-xs text-muted-foreground">
                      Höger öga (OD)
                    </h6>
                    {examination.glasses_prescription_od_sph !== null && (
                      <p>
                        Sfär:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_od_sph}
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_od_cyl !== null && (
                      <p>
                        Cylinder:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_od_cyl}
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_od_axis !== null && (
                      <p>
                        Axel:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_od_axis}°
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_od_add !== null && (
                      <p>
                        Addition:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_od_add}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h6 className="font-medium text-xs text-muted-foreground">
                      Vänster öga (OS)
                    </h6>
                    {examination.glasses_prescription_os_sph !== null && (
                      <p>
                        Sfär:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_os_sph}
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_os_cyl !== null && (
                      <p>
                        Cylinder:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_os_cyl}
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_os_axis !== null && (
                      <p>
                        Axel:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_os_axis}°
                        </span>
                      </p>
                    )}
                    {examination.glasses_prescription_os_add !== null && (
                      <p>
                        Addition:{" "}
                        <span className="font-mono">
                          {examination.glasses_prescription_os_add}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
