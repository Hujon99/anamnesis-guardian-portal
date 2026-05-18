/**
 * ServeitInstructions
 *
 * Återanvändbar, pedagogisk ServeIT-guide som beskriver exakt hur en
 * körkortskoll ska matas in i externa systemet ServeIT. Två lägen:
 *
 *  - mode="guide"  → aktivt steg 4 i körkortsflödet (ServeitTransferView).
 *                   Banner uppmanar att skapa körkortskollen nu.
 *  - mode="review" → visningsläge när man tittar tillbaka på en gammal
 *                   körkortskoll som redan journalförts i ServeIT
 *                   (DrivingLicenseResults).
 *
 * Innehåll i båda lägen: 7 numrerade sektioner i samma ordning som
 * ServeIT-modulerna, "Så här gör du"-hint per sektion, ServeIT-skärmbilder
 * vid Korrektion + Anamnesfrågor, gröna checkrutor som speglar vilka rutor
 * som ska bockas i, och Ja/Nej-pills för anamnesfrågor med kopierbar
 * kommentar.
 *
 * Komponenten är ren UI — all logik (status, sparande, mejl, optiker-val)
 * sker hos parent.
 */

import React, { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, ClipboardCheck, Mail } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { formatVisualAcuityDisplay } from "@/lib/number-utils";
import { parseLicenseCategoryFromNotes } from "./outcomeUtils";
import { cn } from "@/lib/utils";
import correctionExampleImg from "@/assets/serveit-correction-example.png";
import anamnesisExampleImg from "@/assets/serveit-anamnesis-example.png";

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

const StepHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs italic text-muted-foreground mb-1.5">
    Så här gör du i ServeIT: {children}
  </p>
);

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

const FieldRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value === EMPTY ? "" : value);
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

const AnamnesisRow: React.FC<{
  question: string;
  answer: string;
  comment?: string;
}> = ({ question, answer, comment }) => {
  const isYes = answer === "Ja";
  const isNo = answer === "Nej";

  const handleCopyComment = async () => {
    if (!comment) return;
    try {
      await navigator.clipboard.writeText(comment);
      toast({ title: "Kopierat!", description: "Kommentar" });
    } catch {
      toast({
        title: "Kunde inte kopiera",
        description: "Kopiera värdet manuellt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm flex-1">{question}</p>
        <Badge
          className={cn(
            "flex-shrink-0 font-semibold",
            isYes &&
              "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/30",
            isNo && "bg-muted text-muted-foreground hover:bg-muted border-border",
            !isYes && !isNo &&
              "bg-muted text-muted-foreground/60 hover:bg-muted border-border",
          )}
          variant="outline"
        >
          Klicka: {answer}
        </Badge>
      </div>
      {isYes && comment && (
        <div className="mt-2 flex items-start justify-between gap-2 rounded border border-dashed border-border/60 bg-muted/40 px-2 py-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Skriv detta i ServeIT:s kommentarfält:
            </p>
            <p className="text-sm font-mono break-words">{comment}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleCopyComment}
            aria-label="Kopiera kommentar"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface ServeitInstructionsProps {
  examination: any;
  entry: AnamnesesEntry;
  mode: "guide" | "review";
  /** Endast guide-läget: visa "mail skickat"-text. */
  emailSent?: boolean;
}

export const ServeitInstructions: React.FC<ServeitInstructionsProps> = ({
  examination,
  entry,
  mode,
  emailSent = false,
}) => {
  const answers = (entry.answers as Record<string, any>) || {};

  const sections = useMemo(() => {
    const licenseCategory =
      parseLicenseCategoryFromNotes(examination?.notes || "") ?? EMPTY;

    const examDate =
      examination?.created_at || examination?.updated_at || new Date();
    const dateStr = new Date(examDate).toLocaleDateString("sv-SE");
    const basedOn = `Undersökning, ${dateStr}`;

    const idType = entry?.id_type || examination?.id_type;
    const idLabel = idType ? ID_TYPE_LABELS[idType] || idType : EMPTY;

    return {
      licenseCategory,
      basedOn,
      idLabel,
      visusUtanH: formatVisus(examination?.visual_acuity_right_eye),
      visusUtanV: formatVisus(examination?.visual_acuity_left_eye),
      visusUtanB: formatVisus(examination?.visual_acuity_both_eyes),
      visusMedH: formatVisus(examination?.visual_acuity_with_correction_right),
      visusMedV: formatVisus(examination?.visual_acuity_with_correction_left),
      visusMedB: formatVisus(examination?.visual_acuity_with_correction_both),
      correction: buildCorrectionLabel(examination),
      eye: extractAnamnesAnswer(answers, [
        "ogonsjukd",
        "ögonsjukd",
        "synneds",
        "eye_disease",
        "vision_loss",
        "vision_problem",
      ]),
      other: extractAnamnesAnswer(answers, [
        "annan_sjukdom",
        "andra_sjukdomar",
        "sjukdomshistorik",
        "omstandigheter",
        "omständigheter",
        "other_medical",
      ]),
    };
  }, [answers, entry, examination]);

  return (
    <div className="space-y-5">
      {/* Topp-banner — text varierar mellan guide- och review-läge */}
      <Alert className="border-primary/40 bg-primary/5">
        {mode === "guide" ? (
          <Mail className="h-4 w-4" />
        ) : (
          <ClipboardCheck className="h-4 w-4" />
        )}
        <AlertDescription>
          {mode === "guide" ? (
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
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                Den här körkortskollen journalfördes i ServeIT
              </p>
              <p>
                Nedan visas exakt vad som matades in i ServeIT, steg för steg.
                Använd det som referens eller för att se vad som gjordes.
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* 7 ServeIT-sektioner */}
      <div className="rounded-lg border border-border/60 bg-muted/20 divide-y divide-border/40">
        <section className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            1. Intyget avser
          </p>
          <StepHint>
            Bocka i behörigheten nedan i listan "Intyget avser".
          </StepHint>
          <FieldRow label="Behörighet" value={sections.licenseCategory} />
        </section>

        <section className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            2. Intyget är baserat på
          </p>
          <StepHint>Välj "Undersökning" och fyll i datumet.</StepHint>
          <FieldRow label="Underlag" value={sections.basedOn} />
        </section>

        <section className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            3. Identiteten styrkt genom
          </p>
          <StepHint>
            Välj legitimationstyp i listan "Identiteten styrkt genom".
          </StepHint>
          <FieldRow label="Legitimationstyp" value={sections.idLabel} />
        </section>

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
                !!examination?.uses_glasses &&
                !examination?.prescription_over_8d
              }
              label="Glasögon och inget av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen"
            />
            <ServeitCheckbox
              checked={
                !!examination?.uses_glasses &&
                !!examination?.prescription_over_8d
              }
              label="Glasögon och något av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen"
            />
            <ServeitCheckbox
              checked={!!examination?.uses_contact_lenses}
              label="Kontaktlinser"
            />
          </div>
        </section>

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
    </div>
  );
};
