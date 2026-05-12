/**
 * Automated recommendation engine for driving license examinations.
 *
 * Bygger en sammanvägd bild av:
 *   1. Anamnesavvikelser (ögonsjukdom, dubbelseende, mörkerseende, mediciner som
 *      påverkar syn, övriga hälsofaktorer, m.m.)
 *   2. Visusavvikelser (under gränsvärden för aktuell behörighet, bristande
 *      korrektion, ±8 D glasstyrka).
 *
 * Två separata sektioner visas så assistenten ser exakt vad som triggat vad,
 * och ett färgkodat "Rekommenderat utfall"-block föreslår direkt vilket
 * OUTCOME som passar bäst (matchar värdena i `outcomeUtils.ts`).
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Activity,
  Phone,
  Ban,
} from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { formatVisualAcuityDisplay } from "@/lib/number-utils";
import { getOutcomeLabel, type OutcomeValue } from "./outcomeUtils";

interface RecommendationEngineProps {
  examination: any;
  entry: AnamnesesEntry;
}

const isYes = (v: unknown): boolean => {
  if (v === true) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "ja" || s === "yes" || s === "true";
  }
  if (Array.isArray(v)) return v.some(isYes);
  return false;
};

const ANAMNESIS_FLAG_KEYS: Array<{ keyMatch: RegExp; label: string }> = [
  { keyMatch: /ögonsjukdom|eye_disease|ögonsjukdomar/i, label: "Ögonsjukdom rapporterad" },
  { keyMatch: /ögonoperation|eye_surgery/i, label: "Genomgått ögonoperation" },
  { keyMatch: /dubbelseende|double_vision/i, label: "Dubbelseende" },
  { keyMatch: /mörkerseende|night_vision|nattblind/i, label: "Problem med mörkerseende" },
  { keyMatch: /medicin.*(syn|ögon)|påverkar.*syn/i, label: "Mediciner som påverkar syn" },
  { keyMatch: /diabetes/i, label: "Diabetes" },
  { keyMatch: /epilepsi|epilepsy/i, label: "Epilepsi" },
  { keyMatch: /hjärt|heart/i, label: "Hjärtproblem" },
  { keyMatch: /^andra_faktorer|övriga_hälsofaktorer|andra_besvär/i, label: "Övriga hälsofaktorer" },
];

const collectAnamnesisFindings = (
  answers: Record<string, unknown>,
): string[] => {
  const findings: string[] = [];
  const seen = new Set<string>();

  for (const [key, value] of Object.entries(answers)) {
    for (const { keyMatch, label } of ANAMNESIS_FLAG_KEYS) {
      if (keyMatch.test(key) && isYes(value) && !seen.has(label)) {
        findings.push(label);
        seen.add(label);
      }
    }
    // Specialfall: andra_besvär_typ === "Problem med mörkerseendet"
    if (
      /andra_besvär_typ|other_complaints/i.test(key) &&
      typeof value === "string" &&
      value.toLowerCase().includes("mörker")
    ) {
      const label = "Problem med mörkerseende";
      if (!seen.has(label)) {
        findings.push(label);
        seen.add(label);
      }
    }
  }
  return findings;
};

const collectVisusFindings = (examination: any): string[] => {
  const findings: string[] = [];
  if (!examination) return findings;

  const useCorrection =
    examination.uses_glasses || examination.uses_contact_lenses;

  const both = useCorrection
    ? examination.visual_acuity_with_correction_both ??
      examination.visual_acuity_both_eyes
    : examination.visual_acuity_both_eyes;
  const right = useCorrection
    ? examination.visual_acuity_with_correction_right ??
      examination.visual_acuity_right_eye
    : examination.visual_acuity_right_eye;
  const left = useCorrection
    ? examination.visual_acuity_with_correction_left ??
      examination.visual_acuity_left_eye
    : examination.visual_acuity_left_eye;

  const toNum = (v: any): number | null => {
    if (v == null || v === "") return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const bothN = toNum(both);
  const rightN = toNum(right);
  const leftN = toNum(left);

  if (bothN != null && bothN < 1.0) {
    findings.push(
      `Visus båda ögon ${formatVisualAcuityDisplay(bothN)} under 1,0`,
    );
  }
  if (rightN != null && rightN < 1.0) {
    findings.push(
      `Visus höger öga ${formatVisualAcuityDisplay(rightN)} under 1,0`,
    );
  }
  if (leftN != null && leftN < 1.0) {
    findings.push(
      `Visus vänster öga ${formatVisualAcuityDisplay(leftN)} under 1,0`,
    );
  }

  // Hård gräns – under 0,5 binokulärt = ej godkänd för lägre behörigheter
  if (bothN != null && bothN < 0.5) {
    findings.push("Binokulär syn under 0,5 — under hård gräns för körkort");
  }

  // ±8 D-flagga (gäller endast glasögon).
  if (examination.uses_glasses && examination.prescription_over_8d) {
    findings.push("Glasstyrka över ±8 D — Transportstyrelsen ska informeras");
  }

  return findings;
};

interface OutcomeSuggestion {
  value: OutcomeValue;
  label: string;
  tone: "approved" | "approved-warn" | "contact" | "rejected";
  icon: React.ComponentType<any>;
  rationale: string;
}

const computeSuggestion = (
  anamnesis: string[],
  visus: string[],
  examination: any,
): OutcomeSuggestion => {
  const both = examination?.visual_acuity_with_correction_both ??
    examination?.visual_acuity_both_eyes;
  const bothN = both != null && both !== "" ? parseFloat(String(both).replace(",", ".")) : null;
  const visusUnderHardLimit = bothN != null && bothN < 0.5;

  if (visusUnderHardLimit) {
    return {
      value: "not_approved",
      label: getOutcomeLabel("not_approved"),
      tone: "rejected",
      icon: Ban,
      rationale: "Binokulär syn under 0,5 — uppfyller inte synkraven.",
    };
  }
  if (anamnesis.length > 0 && visus.length > 0) {
    return {
      value: "optician_contact_first",
      label: getOutcomeLabel("optician_contact_first"),
      tone: "contact",
      icon: Phone,
      rationale: "Både anamnes och visus visar avvikelser — optiker bör ringa patient innan intyg skickas.",
    };
  }
  if (anamnesis.length > 0) {
    return {
      value: "optician_contact_first",
      label: getOutcomeLabel("optician_contact_first"),
      tone: "contact",
      icon: Phone,
      rationale: "Anamnesen innehåller faktorer som behöver bedömas av optiker.",
    };
  }
  if (visus.length > 0) {
    return {
      value: "approved_recommend_exam",
      label: getOutcomeLabel("approved_recommend_exam"),
      tone: "approved-warn",
      icon: Eye,
      rationale: "Visus är under rekommenderat värde — boka synundersökning.",
    };
  }
  return {
    value: "approved_send",
    label: getOutcomeLabel("approved_send"),
    tone: "approved",
    icon: CheckCircle,
    rationale: "Inga avvikelser identifierade — kan skickas direkt.",
  };
};

const toneStyles: Record<OutcomeSuggestion["tone"], string> = {
  approved: "bg-emerald-50 border-emerald-300 text-emerald-900",
  "approved-warn": "bg-amber-50 border-amber-300 text-amber-900",
  contact: "bg-orange-50 border-orange-300 text-orange-900",
  rejected: "bg-red-50 border-red-300 text-red-900",
};

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  examination,
  entry,
}) => {
  const answers = (entry.answers as Record<string, unknown>) || {};
  const anamnesisFindings = React.useMemo(
    () => collectAnamnesisFindings(answers),
    [answers],
  );
  const visusFindings = React.useMemo(
    () => collectVisusFindings(examination),
    [examination],
  );
  const suggestion = React.useMemo(
    () => computeSuggestion(anamnesisFindings, visusFindings, examination),
    [anamnesisFindings, visusFindings, examination],
  );

  const SuggestionIcon = suggestion.icon;
  const totalFindings = anamnesisFindings.length + visusFindings.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Sammanställning & rekommendation
          <Badge variant={totalFindings > 0 ? "destructive" : "default"}>
            {totalFindings} avvikelse{totalFindings === 1 ? "" : "r"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Anamnesavvikelser */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Anamnesavvikelser
          </h4>
          {anamnesisFindings.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-1 pl-1">
              {anamnesisFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground pl-1">
              Inga anamnesavvikelser identifierade.
            </p>
          )}
        </div>

        {/* Visusavvikelser */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Visusavvikelser
          </h4>
          {visusFindings.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-1 pl-1">
              {visusFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground pl-1">
              Inga visusavvikelser identifierade.
            </p>
          )}
        </div>

        {/* Föreslaget utfall — färgkodat hero-block */}
        <div
          className={`rounded-lg border-2 p-4 space-y-2 ${toneStyles[suggestion.tone]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <SuggestionIcon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Rekommenderat utfall
            </span>
          </div>
          <p className="text-lg font-semibold leading-tight">
            {suggestion.label}
          </p>
          <p className="text-sm opacity-90">{suggestion.rationale}</p>
        </div>

        {/* Teknisk info */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
          <p>
            <strong>Visus utan korrektion:</strong> båda{" "}
            {formatVisualAcuityDisplay(examination?.visual_acuity_both_eyes)} ·
            höger {formatVisualAcuityDisplay(examination?.visual_acuity_right_eye)} ·
            vänster {formatVisualAcuityDisplay(examination?.visual_acuity_left_eye)}
          </p>
          {(examination?.uses_glasses || examination?.uses_contact_lenses) && (
            <p>
              <strong>Med korrektion:</strong> båda{" "}
              {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_both)} ·
              höger {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_right)} ·
              vänster {formatVisualAcuityDisplay(examination?.visual_acuity_with_correction_left)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
