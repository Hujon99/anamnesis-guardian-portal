/**
 * ServeitTransferView
 *
 * Slutsteget i körkortsundersökningens app-flöde (steg 4 i
 * `DrivingLicenseExamination.tsx`). Ersätter den tidigare `ExaminationSummary`
 * som var en generisk slutskärm.
 *
 * Syfte: hjälpa assistenten att manuellt mata in resultaten i externa
 * systemet ServeIT. Assistenten journalför INTE — det gör optikern.
 *
 * Vyn består av tre delar i en vertikal kolumn (inga tabs/accordion):
 *  1. Instruktionsbanner överst (gul/blå) med Swedish copy.
 *  2. 7 read-only ServeIT-sektioner i exakt ordning enligt ServeIT-modulerna,
 *     varje fält har Copy-knapp som lägger värdet på urklipp + visar toast.
 *  3. Bedömning + Ansvarig optiker + (valfri) Anteckning — samma logik som
 *     `ServitJournalDialog`/gamla `ExaminationSummary` (sparar med
 *     `combineNotesWithOutcome`, kallar `assignOptician`, skickar mejl via
 *     edge-funktionen `notify-optician-driving-license`).
 *
 * Vid "Markera som skapad och sparad i ServeIT" sätts
 * `examination_status='completed'`, `completion_method='servit'` på
 * driving_license_examinations-raden via parent-komponentens `onSave`.
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  Copy,
  Mail,
  ClipboardCheck,
  User,
} from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { formatVisualAcuityDisplay } from "@/lib/number-utils";
import {
  OUTCOME_OPTIONS,
  type OutcomeValue,
  parseOutcomeFromNotes,
  parseLicenseCategoryFromNotes,
  combineNotesWithOutcome,
  getOutcomeLabel,
} from "./outcomeUtils";
import { cn } from "@/lib/utils";
import { RecommendationEngine } from "./RecommendationEngine";
import { Badge } from "@/components/ui/badge";
import correctionExampleImg from "@/assets/serveit-correction-example.png";
import anamnesisExampleImg from "@/assets/serveit-anamnesis-example.png";

interface ServeitTransferViewProps {
  examination: any;
  entry: AnamnesesEntry;
  onSave: (updates: any) => Promise<void>;
  onComplete: () => void;
  isSaving: boolean;
}

const EMPTY = "—";

const ID_TYPE_LABELS: Record<string, string> = {
  swedish_license: "Körkort",
  swedish_id: "ID-kort",
  passport: "Pass",
  guardian_certificate: "Vårdnadshavares intyg",
};

const formatVisus = (value: any): string => {
  const formatted = formatVisualAcuityDisplay(value);
  if (!formatted || formatted === "-" || formatted === "—") return EMPTY;
  return formatted;
};

const buildCorrectionLabel = (examination: any): string => {
  const usesGlasses = !!examination?.uses_glasses;
  const usesLenses = !!examination?.uses_contact_lenses;
  if (!usesGlasses && !usesLenses) return EMPTY;

  const parts: string[] = [];
  if (usesGlasses) {
    const dioptri = examination?.prescription_over_8d
      ? "över ±8 D"
      : "under ±8 D";
    parts.push(`Glasögon — ${dioptri}`);
  }
  if (usesLenses) parts.push("Kontaktlinser");
  return parts.join(" + ");
};

/**
 * Hittar svaret på en anamnesfråga genom att leta efter en frågetext eller
 * frågeID som matchar något av de svenska nyckelorden. Returnerar Ja/Nej +
 * eventuell följdfråga (kommentar).
 */
const extractAnamnesAnswer = (
  answers: Record<string, any>,
  keywords: string[],
): { ja: string; comment: string } => {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  let ja: any = undefined;
  const commentParts: string[] = [];

  for (const [key, value] of Object.entries(answers)) {
    const k = key.toLowerCase();
    if (!lowerKeywords.some((kw) => k.includes(kw))) continue;

    if (typeof value === "boolean") {
      if (ja === undefined) ja = value ? "Ja" : "Nej";
    } else if (typeof value === "string") {
      const v = value.trim();
      if (!v) continue;
      const vl = v.toLowerCase();
      if (vl === "ja" || vl === "yes") {
        if (ja === undefined) ja = "Ja";
      } else if (vl === "nej" || vl === "no") {
        if (ja === undefined) ja = "Nej";
      } else {
        commentParts.push(v);
      }
    } else if (Array.isArray(value)) {
      const flat = value.filter(Boolean).map((x) => String(x)).join(", ");
      if (flat) commentParts.push(flat);
    }
  }

  return {
    ja: ja ?? EMPTY,
    comment: commentParts.length ? commentParts.join("; ") : "",
  };
};

/** Liten instruktionsrad ovanför värdena i varje ServeIT-sektion. */
const StepHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs italic text-muted-foreground mb-1.5">
    Så här gör du i ServeIT: {children}
  </p>
);

/** Visuell representation av en ServeIT-checkruta. `checked` = ska bockas i. */
const ServeitCheckbox: React.FC<{ checked: boolean; label: string }> = ({
  checked,
  label,
}) => (
  <div
    className={cn(
      "flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
      checked
        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
        : "border-border/60 bg-background/40 text-muted-foreground",
    )}
  >
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border",
        checked
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-muted-foreground/40 bg-background",
      )}
      aria-hidden
    >
      {checked && <CheckCircle className="h-3 w-3" strokeWidth={3} />}
    </span>
    <span className={cn(checked && "font-medium")}>{label}</span>
  </div>
);

interface FieldRowProps {
  label: string;
  value: string;
  copyValue?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, copyValue }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? (value === EMPTY ? "" : value));
      toast({ title: "Kopierat!", description: label });
    } catch {
      toast({
        title: "Kunde inte kopiera",
        description: "Kopiera värdet manuellt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-sm font-mono break-words",
            value === EMPTY && "text-muted-foreground/60",
          )}
        >
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={handleCopy}
        aria-label={`Kopiera ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export const ServeitTransferView: React.FC<ServeitTransferViewProps> = ({
  examination,
  entry,
  onSave,
  onComplete,
  isSaving,
}) => {
  const initialParsed = parseOutcomeFromNotes(examination?.notes || "");
  const [notes, setNotes] = useState(initialParsed.rest);
  const [outcome, setOutcome] = useState<OutcomeValue | "">(initialParsed.outcome);
  const [selectedOpticianId, setSelectedOpticianId] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const { opticians, isLoading: loadingOpticians } = useOpticians();
  const { assignOptician } = useEntryMutations(entry.id);
  const { supabase } = useSupabaseClient();

  const isCompleted = examination?.examination_status === "completed";
  const answers = (entry.answers as Record<string, any>) || {};

  // ── 7 ServeIT-sektioner ────────────────────────────────────────────────
  const sections = useMemo(() => {
    const licenseCategory =
      parseLicenseCategoryFromNotes(examination?.notes || "") ?? EMPTY;

    const todayStr = new Date().toLocaleDateString("sv-SE");
    const basedOn = `Undersökning, ${todayStr}`;

    const idType = entry?.id_type || examination?.id_type;
    const idLabel = idType ? ID_TYPE_LABELS[idType] || idType : EMPTY;

    const visusUtanH = formatVisus(examination?.visual_acuity_right_eye);
    const visusUtanV = formatVisus(examination?.visual_acuity_left_eye);
    const visusUtanB = formatVisus(examination?.visual_acuity_both_eyes);

    const visusMedH = formatVisus(examination?.visual_acuity_with_correction_right);
    const visusMedV = formatVisus(examination?.visual_acuity_with_correction_left);
    const visusMedB = formatVisus(examination?.visual_acuity_with_correction_both);

    const correction = buildCorrectionLabel(examination);

    const eye = extractAnamnesAnswer(answers, [
      "ogonsjukd",
      "ögonsjukd",
      "synneds",
      "eye_disease",
      "vision_loss",
      "vision_problem",
    ]);
    const other = extractAnamnesAnswer(answers, [
      "annan_sjukdom",
      "andra_sjukdomar",
      "sjukdomshistorik",
      "omstandigheter",
      "omständigheter",
      "other_medical",
    ]);

    return {
      licenseCategory,
      basedOn,
      idLabel,
      visusUtanH,
      visusUtanV,
      visusUtanB,
      visusMedH,
      visusMedV,
      visusMedB,
      correction,
      eye,
      other,
    };
  }, [answers, entry, examination]);

  const handleConfirm = async () => {
    if (!outcome) {
      toast({
        title: "Bedömning saknas",
        description: "Välj utfall innan du markerar som skapad i ServeIT.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedOpticianId) {
      toast({
        title: "Ingen optiker vald",
        description: "Välj ansvarig optiker som ska få notisen.",
        variant: "destructive",
      });
      return;
    }
    const selectedOptician = opticians.find(
      (o) => o.clerk_user_id === selectedOpticianId,
    );
    if (!selectedOptician?.email) {
      toast({
        title: "E-post saknas",
        description: "Den valda optikern har ingen e-postadress.",
        variant: "destructive",
      });
      return;
    }

    const outcomeLabel = getOutcomeLabel(outcome);
    const licenseCategory = parseLicenseCategoryFromNotes(examination?.notes || "");
    const combinedNotes = combineNotesWithOutcome(outcome, notes, licenseCategory);

    try {
      await onSave({
        examination_status: "completed",
        completion_method: "servit",
        notes: combinedNotes,
      });

      await assignOptician(selectedOpticianId);

      try {
        const { error: emailError } = await supabase.functions.invoke(
          "notify-optician-driving-license",
          {
            body: {
              entryId: entry.id,
              opticianEmail: selectedOptician.email,
              appUrl: window.location.origin,
              completionMethod: "servit",
              outcomeLabel,
            },
          },
        );
        if (emailError) {
          console.error("[ServeitTransferView] Email error:", emailError);
        }
      } catch (mailErr) {
        console.error("[ServeitTransferView] Email exception:", mailErr);
      }

      setEmailSent(true);
      toast({
        title: "Markerad som skapad i ServeIT",
        description: `${getOpticianDisplayName(selectedOptician)} har notifierats.`,
      });
      onComplete();
    } catch (err: any) {
      console.error("[ServeitTransferView] Failed:", err);
      toast({
        title: "Kunde inte spara",
        description: err?.message || "Ett oväntat fel inträffade.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Skapa körkortskoll i ServeIT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-w-3xl">
        {/* 1. Instruktionsbanner */}
        <Alert className="border-primary/40 bg-primary/5">
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold">
                Så här skapar du körkortskollen i ServeIT
              </p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>
                  Öppna ServeIT och starta en ny körkortskoll med kundens
                  personnummer.
                </li>
                <li>
                  Följ steg 1–7 nedan i ordning. Vid varje fält står det vad du
                  ska klicka i eller skriva in.
                </li>
                <li>Spara körkortskollen i ServeIT när du är klar.</li>
              </ol>
              <p className="pt-1">
                {emailSent
                  ? "Mail har skickats till optikern."
                  : "Mail skickas till optikern när du klickar på “Markera som skapad” längst ned."}
              </p>
              <p className="font-semibold">
                Du som assistent ska inte journalföra — det gör optikern.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* 2. Sju ServeIT-sektioner */}
        <div className="rounded-lg border border-border/60 bg-muted/20 divide-y divide-border/40">
          {/* 1. Intyget avser */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              1. Intyget avser
            </p>
            <StepHint>
              Bocka i behörigheten nedan i listan "Intyget avser".
            </StepHint>
            <FieldRow label="Behörighet" value={sections.licenseCategory} />
          </section>

          {/* 2. Intyget är baserat på */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              2. Intyget är baserat på
            </p>
            <StepHint>
              Välj "Undersökning" och fyll i dagens datum.
            </StepHint>
            <FieldRow label="Underlag" value={sections.basedOn} />
          </section>

          {/* 3. Identiteten styrkt genom */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              3. Identiteten styrkt genom
            </p>
            <StepHint>
              Välj legitimationstyp i listan "Identiteten styrkt genom".
            </StepHint>
            <FieldRow label="Legitimationstyp" value={sections.idLabel} />
          </section>

          {/* 4. Synskärpa utan korrektion */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              4. Synskärpa utan korrektion
            </p>
            <StepHint>
              Skriv in synskärpan i fälten Höger / Vänster / Binokulärt.
            </StepHint>
            <FieldRow label="Höger" value={sections.visusUtanH} />
            <FieldRow label="Vänster" value={sections.visusUtanV} />
            <FieldRow label="Binokulärt" value={sections.visusUtanB} />
          </section>

          {/* 5. Synskärpa med korrektion */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              5. Synskärpa med korrektion
            </p>
            <StepHint>
              Skriv in värdena i motsvarande fält. Lämna tomt om patienten inte
              använder korrektion.
            </StepHint>
            <FieldRow label="Höger" value={sections.visusMedH} />
            <FieldRow label="Vänster" value={sections.visusMedV} />
            <FieldRow label="Binokulärt" value={sections.visusMedB} />
          </section>

          {/* 6. Korrektion */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              6. Korrektion
            </p>
            <StepHint>
              Bocka i exakt de rutor som markeras med grönt nedan. Bilden visar
              hur rutorna ser ut i ServeIT.
            </StepHint>
            <FieldRow label="Sammanfattning" value={sections.correction} />
            <figure className="mt-2">
              <img
                src={correctionExampleImg}
                alt="Skärmbild från ServeIT: korrektionsrutorna för glasögon och kontaktlinser"
                className="w-full max-w-md rounded-md border border-border/60"
                loading="lazy"
              />
              <figcaption className="text-xs text-muted-foreground mt-1">
                Så ser sektionen ut i ServeIT.
              </figcaption>
            </figure>
            <div className="mt-3 space-y-1.5">
              <ServeitCheckbox
                checked={
                  !!examination?.uses_glasses && !examination?.prescription_over_8d
                }
                label="Glasögon och inget av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen"
              />
              <ServeitCheckbox
                checked={
                  !!examination?.uses_glasses && !!examination?.prescription_over_8d
                }
                label="Glasögon och något av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen"
              />
              <ServeitCheckbox
                checked={!!examination?.uses_contact_lenses}
                label="Kontaktlinser"
              />
            </div>
          </section>

          {/* 7. Anamnesfrågor */}
          <section className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              7. Anamnesfrågor
            </p>
            <StepHint>
              Klicka Ja eller Nej för varje fråga enligt patientens svar nedan.
              Om Ja: skriv in kommentaren i textfältet i ServeIT.
            </StepHint>
            <figure className="mt-2 mb-3">
              <img
                src={anamnesisExampleImg}
                alt="Skärmbild från ServeIT: anamnesfrågor med Ja/Nej-knappar"
                className="w-full max-w-md rounded-md border border-border/60"
                loading="lazy"
              />
              <figcaption className="text-xs text-muted-foreground mt-1">
                Så ser anamnesfrågorna ut i ServeIT.
              </figcaption>
            </figure>
            <div className="space-y-3">
              <AnamnesisRow
                question="a) Finns uppgift om ögonsjukdom eller synnedsättning?"
                answer={sections.eye.ja}
                comment={sections.eye.comment}
              />
              <AnamnesisRow
                question="b) Finns uppgift om annan sjukdomshistorik eller andra omständigheter?"
                answer={sections.other.ja}
                comment={sections.other.comment}
              />
            </div>
          </section>
        </div>

        {/* Rekommendation / sammanfattning till optiker — följer med från tidigare steg */}
        <section aria-labelledby="recommendation-heading" className="space-y-2">
          <h3
            id="recommendation-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Rekommendation / sammanfattning till optiker
          </h3>
          <RecommendationEngine examination={examination} entry={entry} />
        </section>

        <Separator />

        {/* 3. Bedömning + Optiker + Anteckning */}
        {!isCompleted && (
          <>
            <div className="space-y-2">
              <Label htmlFor="outcome-select" className="font-medium">
                Bedömning av assistent
              </Label>
              <Select
                value={outcome}
                onValueChange={(v) => setOutcome(v as OutcomeValue)}
                disabled={isSaving}
              >
                <SelectTrigger id="outcome-select">
                  <SelectValue placeholder="Välj utfall" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stöd för optikern. Slutligt beslut fattas i ServeIT.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="optician-select"
                className="font-medium flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Ansvarig optiker
              </Label>
              <Select
                value={selectedOpticianId}
                onValueChange={setSelectedOpticianId}
                disabled={loadingOpticians || isSaving}
              >
                <SelectTrigger id="optician-select">
                  <SelectValue
                    placeholder={
                      loadingOpticians ? "Laddar optiker..." : "Välj optiker"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {opticians.map((opt) => (
                    <SelectItem key={opt.id} value={opt.clerk_user_id}>
                      {getOpticianDisplayName(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servit-notes">Anteckningar (valfritt)</Label>
              <Textarea
                id="servit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isSaving}
                placeholder="T.ex. förtydligande till optikern..."
              />
            </div>
          </>
        )}

        {/* 4. Primary CTA */}
        {isCompleted ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Markerad som skapad i ServeIT{" "}
              {examination?.updated_at
                ? new Date(examination.updated_at).toLocaleString("sv-SE")
                : ""}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onComplete} disabled={isSaving}>
              Avbryt
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving || !outcome || !selectedOpticianId}
            >
              {isSaving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isSaving
                ? "Sparar..."
                : "Markera som skapad och sparad i ServeIT"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
