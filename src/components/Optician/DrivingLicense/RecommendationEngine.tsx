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
import {
  getOutcomeLabel,
  parseLicenseCategoryFromNotes,
  getRequirementGroupFromCategoryName,
  type OutcomeValue,
  type RequirementGroup,
} from "./outcomeUtils";

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
  { keyMatch: /^andra_sjukdomar$|^sjukdomar_mediciner$|^har_sjukdomar_mediciner$|^mediciner$/i, label: "Andra sjukdomar / medicinering" },
  { keyMatch: /^andra_faktorer|övriga_hälsofaktorer|andra_besvär/i, label: "Övriga hälsofaktorer" },
];

// Matchas mot alla strängvärden (inkl. element i arrayer) — fångar t.ex.
// "Diabetes typ II" som ligger inuti `andra_sjukdomar_lista`-arrayen.
const ANAMNESIS_VALUE_FLAGS: Array<{ valueMatch: RegExp; label: string }> = [
  { valueMatch: /diabet/i, label: "Diabetes" },
  { valueMatch: /epilep/i, label: "Epilepsi" },
  { valueMatch: /\bstroke\b|\btia\b/i, label: "Stroke/TIA" },
  { valueMatch: /hjärt|hjart|hypertoni|blodtryck/i, label: "Hjärt-/kärlsjukdom" },
  { valueMatch: /demens|alzheimer|kognitiv/i, label: "Demens / kognitiv svikt" },
  { valueMatch: /parkinson|\bms\b|skleros|neurologisk/i, label: "Neurologisk sjukdom" },
  { valueMatch: /sömnapn|somnapn|narkolep/i, label: "Sömnstörning (apné/narkolepsi)" },
  { valueMatch: /psykos|bipolär|bipolar|schizofren/i, label: "Allvarlig psykisk sjukdom" },
  { valueMatch: /alkohol|\bdrog|missbruk|beroende/i, label: "Missbruk/beroende" },
  { valueMatch: /mörker/i, label: "Problem med mörkerseende" },
];

const walkValues = (value: unknown, cb: (s: string) => void): void => {
  if (value == null) return;
  if (typeof value === "string") {
    cb(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkValues(item, cb);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) walkValues(v, cb);
  }
};

const collectAnamnesisFindings = (
  answers: Record<string, unknown>,
): string[] => {
  const findings: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    if (!seen.has(label)) {
      findings.push(label);
      seen.add(label);
    }
  };

  for (const [key, value] of Object.entries(answers)) {
    for (const { keyMatch, label } of ANAMNESIS_FLAG_KEYS) {
      if (keyMatch.test(key) && isYes(value)) add(label);
    }
  }

  walkValues(answers, (str) => {
    for (const { valueMatch, label } of ANAMNESIS_VALUE_FLAGS) {
      if (valueMatch.test(str)) add(label);
    }
  });

  return findings;
};

interface VisusFinding {
  text: string;
  hard: boolean;
}

const collectVisusFindings = (
  examination: any,
  requirementGroup: RequirementGroup,
): VisusFinding[] => {
  const findings: VisusFinding[] = [];
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

  if (requirementGroup === 'lower') {
    if (bothN != null && bothN < 0.5) {
      findings.push({
        text: `Binokulär syn ${formatVisualAcuityDisplay(bothN)} under hård gräns 0,5 för grupp I`,
        hard: true,
      });
    } else {
      if (bothN != null && bothN < 1.0) {
        findings.push({ text: `Visus båda ögon ${formatVisualAcuityDisplay(bothN)} under 1,0`, hard: false });
      }
      if (rightN != null && rightN < 1.0) {
        findings.push({ text: `Visus höger öga ${formatVisualAcuityDisplay(rightN)} under 1,0`, hard: false });
      }
      if (leftN != null && leftN < 1.0) {
        findings.push({ text: `Visus vänster öga ${formatVisualAcuityDisplay(leftN)} under 1,0`, hard: false });
      }
    }
  } else if (requirementGroup === 'higher') {
    // Bästa/sämsta öga från right/left, annars fall back till bothN för båda.
    const eyes = [rightN, leftN].filter((n): n is number => n != null);
    const bestEye = eyes.length > 0 ? Math.max(...eyes) : bothN;
    const worstEye = eyes.length > 0 ? Math.min(...eyes) : bothN;
    if (bestEye != null && bestEye < 0.8) {
      findings.push({
        text: `Bästa ögat ${formatVisualAcuityDisplay(bestEye)} under hård gräns 0,8 för högre behörighet`,
        hard: true,
      });
    }
    if (worstEye != null && worstEye < 0.1) {
      findings.push({
        text: `Sämsta ögat ${formatVisualAcuityDisplay(worstEye)} under hård gräns 0,1 för högre behörighet`,
        hard: true,
      });
    }
  } else if (requirementGroup === 'taxi') {
    if (bothN != null && bothN < 0.8) {
      findings.push({
        text: `Binokulär syn ${formatVisualAcuityDisplay(bothN)} under hård gräns 0,8 för taxiförarlegitimation`,
        hard: true,
      });
    }
  }

  // ±8 D-flagga (gäller endast glasögon) — informationskrav, inte hård gräns.
  if (examination.uses_glasses && examination.prescription_over_8d) {
    findings.push({
      text: "Glasstyrka över ±8 D — Transportstyrelsen ska informeras",
      hard: false,
    });
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
  visus: VisusFinding[],
): OutcomeSuggestion => {
  const hardVisus = visus.filter((f) => f.hard).map((f) => f.text);
  const visusTexts = visus.map((f) => f.text);

  if (hardVisus.length > 0) {
    const reasons = [...hardVisus, ...anamnesis];
    return {
      value: "not_approved",
      label: getOutcomeLabel("not_approved"),
      tone: "rejected",
      icon: Ban,
      rationale: `Skäl: ${reasons.join(' · ')}`,
    };
  }
  if (anamnesis.length > 0 && visusTexts.length > 0) {
    return {
      value: "optician_contact_first",
      label: getOutcomeLabel("optician_contact_first"),
      tone: "contact",
      icon: Phone,
      rationale: `Skäl: ${[...anamnesis, ...visusTexts].join(' · ')}`,
    };
  }
  if (anamnesis.length > 0) {
    return {
      value: "optician_contact_first",
      label: getOutcomeLabel("optician_contact_first"),
      tone: "contact",
      icon: Phone,
      rationale: `Skäl: ${anamnesis.join(' · ')}`,
    };
  }
  if (visusTexts.length > 0) {
    return {
      value: "approved_recommend_exam",
      label: getOutcomeLabel("approved_recommend_exam"),
      tone: "approved-warn",
      icon: Eye,
      rationale: `Skäl: ${visusTexts.join(' · ')}`,
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
  const requirementGroup = React.useMemo<RequirementGroup>(
    () => getRequirementGroupFromCategoryName(parseLicenseCategoryFromNotes(examination?.notes ?? '')),
    [examination?.notes],
  );
  const anamnesisFindings = React.useMemo(
    () => collectAnamnesisFindings(answers),
    [answers],
  );
  const visusFindings = React.useMemo(
    () => collectVisusFindings(examination, requirementGroup),
    [examination, requirementGroup],
  );
  const suggestion = React.useMemo(
    () => computeSuggestion(anamnesisFindings, visusFindings),
    [anamnesisFindings, visusFindings],
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
            <Badge variant={anamnesisFindings.length > 0 ? "destructive" : "secondary"}>
              {anamnesisFindings.length}
            </Badge>
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
            <Badge variant={visusFindings.length > 0 ? "destructive" : "secondary"}>
              {visusFindings.length}
            </Badge>
          </h4>
          {visusFindings.length > 0 ? (
            <ul className="list-disc list-inside text-sm space-y-1 pl-1">
              {visusFindings.map((f, i) => (
                <li key={i} className={f.hard ? "text-destructive font-medium" : undefined}>{f.text}</li>
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
          {suggestion.rationale.startsWith('Skäl: ') ? (
            <ul className="text-sm opacity-90 list-disc list-inside space-y-0.5">
              {suggestion.rationale.slice(6).split(' · ').map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-90">{suggestion.rationale}</p>
          )}
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
