/**
 * Component for conducting visual acuity measurements during driving license examinations.
 * Handles input for both eyes separately, with/without correction, and provides
 * real-time validation with automatic warnings when vision is below required limits.
 * Validates based on Swedish driving license vision requirements for different license categories.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, AlertTriangle, Info } from "lucide-react";
import { parseLocaleFloat } from "@/lib/number-utils";
import { toast } from "@/hooks/use-toast";
import { LICENSE_CATEGORY_PREFIX, parseLicenseCategoryFromNotes } from "./outcomeUtils";

// VISUS scale values according to Swedish driving license examination standards
// Updated based on optician feedback to include correct clinical values (1.1, 1.2, 1.6)
const VISUS_SCALE = [
  '0.05', '0.08', '0.1', '0.16', '0.2', '0.25', '0.3', '0.4', 
  '0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '1.1', '1.2', '1.6', '2.0'
];

interface VisualAcuityMeasurementProps {
  examination: any;
  entry?: any; // Form entry with answers
  onSave: (updates: any) => Promise<void>;
  onNext: () => void;
  isSaving: boolean;
}

// License category types mirror the buttons in the patient form while keeping
// the clinical validation grouped according to Transportstyrelsens requirements.
type LicenseCategory = 'group1' | 'group2_3' | 'renewal_higher' | 'taxi' | 'other';

const LICENSE_CATEGORIES = {
  group1: {
    name: 'Körkortstillstånd grupp I (A, AM, B, BE ) moped, motorcykel, bil, tungt släp',
    requirementGroup: 'lower',
    requirements: 'Minst 0,5 binokulart (båda ögonen) - med eller utan glasögon/linser'
  },
  group2_3: {
    name: 'Körkortstillstånd grupp II och III (C, D) Lastbil och buss',
    requirementGroup: 'higher',
    requirements: 'Minst 0,8 i bästa ögat och minst 0,1 i sämsta ögat'
  },
  renewal_higher: {
    name: 'Förlängning av högre/tyngre behörighet',
    requirementGroup: 'higher',
    requirements: 'Minst 0,8 i bästa ögat och minst 0,1 i sämsta ögat'
  },
  taxi: {
    name: 'Taxiförarlegitimation',
    requirementGroup: 'taxi',
    requirements: 'Minst 0,8 binokulart'
  },
  other: {
    name: 'Annan orsak',
    requirementGroup: 'lower',
    requirements: 'Minst 0,5 binokulart (båda ögonen) - med eller utan glasögon/linser'
  }
} satisfies Record<LicenseCategory, { name: string; requirementGroup: 'lower' | 'higher' | 'taxi'; requirements: string }>;

export const VisualAcuityMeasurement: React.FC<VisualAcuityMeasurementProps> = ({
  examination,
  entry,
  onSave,
  onNext,
  isSaving
}) => {
  // Check if customer uses glasses/contact lenses from form answers
  const usesCorrection = React.useMemo(() => {
    if (!entry?.answers) return false;
    
    // Look for answers about glasses or contact lens usage
    const answers = entry.answers;
    
    // Check various possible question patterns for glasses/contact usage
    for (const [key, value] of Object.entries(answers)) {
      const keyLower = key.toLowerCase();
      const valueLower = String(value).toLowerCase();
      
      // Check if question is about glasses/contact lenses and answer is yes
      if ((keyLower.includes('glasögon') || keyLower.includes('kontaktlinser') || 
           keyLower.includes('linser') || keyLower.includes('synskärpa') ||
           keyLower.includes('synhjälpmedel')) && 
          (valueLower === 'ja' || valueLower === 'yes' || valueLower === 'true')) {
        return true;
      }
    }
    
    return false;
  }, [entry?.answers]);

  // Try to detect the exact license option from previously saved notes OR form answers.
  // Saved notes use "Behörighetstyp: <namn>\n..." and must preserve the user's original button label.
  const detectedLicenseCategory = React.useMemo((): LicenseCategory => {
    // Hjälpare: mappa fri text till samma val som visas i patientformuläret.
    const matchCategory = (raw: string): LicenseCategory | null => {
      const v = raw.toLowerCase();
      const normalized = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (v.includes('taxi')) return 'taxi';
      if (v.includes('annan orsak')) return 'other';
      if (
        (normalized.includes('forlangning') && (normalized.includes('hogre') || normalized.includes('tyngre'))) ||
        normalized.includes('forlangning av hogre')
      ) return 'renewal_higher';
      if (
        normalized.includes('grupp ii') ||
        normalized.includes('grupp 2') ||
        normalized.includes('grupp iii') ||
        normalized.includes('grupp 3') ||
        normalized.includes('hogre behorighet') ||
        v.includes('c1') ||
        /(^|\s)c(,|\s|$)/i.test(raw) ||
        /(^|\s)d(,|\s|$)/i.test(raw) ||
        v.includes('lastbil') ||
        v.includes('buss')
      ) return 'group2_3';
      if (
        normalized.includes('grupp i') ||
        normalized.includes('lagre behorighet') ||
        v.includes('am') ||
        v.includes('moped') ||
        v.includes('motorcykel') ||
        v.includes('tungt släp') ||
        /(^|\s)b(,|\s|$)/i.test(raw)
      ) return 'group1';
      return null;
    };

    // 1. Försök läsa från sparade notes först.
    const savedName = parseLicenseCategoryFromNotes(examination?.notes ?? '');
    if (savedName) {
      for (const [key, cat] of Object.entries(LICENSE_CATEGORIES)) {
        if (cat.name === savedName) return key as LicenseCategory;
      }
      const matched = matchCategory(savedName);
      if (matched) return matched;
    }

    // 2. Annars, härled från anamnessvar.
    if (!entry?.answers) return 'group1';
    const answers = entry.answers as Record<string, unknown>;

    const collectValues = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap(collectValues);
      if (typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(collectValues);
      return [String(value)];
    };

    for (const rawValue of Object.values(answers)) {
      for (const value of collectValues(rawValue)) {
        const matched = matchCategory(value);
        if (matched) return matched;
      }
    }

    return 'group1';
  }, [entry?.answers, examination?.notes]);

  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>(detectedLicenseCategory);
  // När användaren manuellt ändrar väljaren slutar vi auto-synca.
  const [userOverridden, setUserOverridden] = useState(false);

  // Synca när detekterat värde hinner uppdateras efter att entry/notes hydreras
  // (annars fastnar dropdown på 'lower' eftersom useState bara kör init en gång).
  useEffect(() => {
    if (!userOverridden) {
      setLicenseCategory(detectedLicenseCategory);
    }
  }, [detectedLicenseCategory, userOverridden]);

  // Härled initialt om patienten har styrke-värden registrerade (då är ±8 D-rutan på).
  const initialHasPrescription = Boolean(
    examination?.glasses_prescription_od_sph ||
    examination?.glasses_prescription_od_cyl ||
    examination?.glasses_prescription_os_sph ||
    examination?.glasses_prescription_os_cyl
  );

  const [measurements, setMeasurements] = useState({
    visual_acuity_both_eyes: examination?.visual_acuity_both_eyes || '',
    visual_acuity_right_eye: examination?.visual_acuity_right_eye || '',
    visual_acuity_left_eye: examination?.visual_acuity_left_eye || '',
    visual_acuity_with_correction_both: examination?.visual_acuity_with_correction_both || '',
    visual_acuity_with_correction_right: examination?.visual_acuity_with_correction_right || '',
    visual_acuity_with_correction_left: examination?.visual_acuity_with_correction_left || '',
    // Separata flaggor för glasögon resp. kontaktlinser. Christians feedback:
    // styrkor är endast relevanta för glasögon, aldrig för linser.
    uses_glasses: Boolean(examination?.uses_glasses) || (usesCorrection && !examination?.uses_contact_lenses),
    uses_contact_lenses: Boolean(examination?.uses_contact_lenses),
    // Kryssruta som visas om "Använder glasögon" är ikryssat. Vid ja → visa
    // styrke-fält (sfär/cyl/axel) per öga. Sparar mot befintliga DB-kolumner.
    prescription_over_8d: initialHasPrescription,
    glasses_prescription_od_sph: examination?.glasses_prescription_od_sph ?? '',
    glasses_prescription_od_cyl: examination?.glasses_prescription_od_cyl ?? '',
    glasses_prescription_od_axis: examination?.glasses_prescription_od_axis ?? '',
    glasses_prescription_od_add: examination?.glasses_prescription_od_add ?? '',
    glasses_prescription_os_sph: examination?.glasses_prescription_os_sph ?? '',
    glasses_prescription_os_cyl: examination?.glasses_prescription_os_cyl ?? '',
    glasses_prescription_os_axis: examination?.glasses_prescription_os_axis ?? '',
    glasses_prescription_os_add: examination?.glasses_prescription_os_add ?? '',
  });

  const [warnings, setWarnings] = useState<string[]>([]);

  // Validate measurements based on license category and generate warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    const bothEyes = parseLocaleFloat(measurements.visual_acuity_both_eyes);
    const rightEye = parseLocaleFloat(measurements.visual_acuity_right_eye);
    const leftEye = parseLocaleFloat(measurements.visual_acuity_left_eye);
    const withCorrectionBoth = parseLocaleFloat(measurements.visual_acuity_with_correction_both);
    const withCorrectionRight = parseLocaleFloat(measurements.visual_acuity_with_correction_right);
    const withCorrectionLeft = parseLocaleFloat(measurements.visual_acuity_with_correction_left);

    // "Använder korrektion" = antingen glasögon eller linser.
    const usesAnyCorrection = measurements.uses_glasses || measurements.uses_contact_lenses;

    // Use corrected values if correction is used, otherwise use uncorrected
    const effectiveBoth = usesAnyCorrection && !isNaN(withCorrectionBoth) ? withCorrectionBoth : bothEyes;
    const effectiveRight = usesAnyCorrection && !isNaN(withCorrectionRight) ? withCorrectionRight : rightEye;
    const effectiveLeft = usesAnyCorrection && !isNaN(withCorrectionLeft) ? withCorrectionLeft : leftEye;

    // Apply validation rules based on the clinical requirement group while preserving the exact displayed label.
    switch (LICENSE_CATEGORIES[licenseCategory].requirementGroup) {
      case 'lower':
        if (!isNaN(effectiveBoth) && effectiveBoth < 0.5) {
          newWarnings.push("Visusvärde båda ögon är under gränsvärdet 0,5 för lägre behörigheter");
        }
        break;

      case 'higher':
        const bestEye = Math.max(effectiveRight || 0, effectiveLeft || 0);
        const worstEye = Math.min(effectiveRight || 0, effectiveLeft || 0);
        if (bestEye < 0.8) {
          newWarnings.push("Bästa ögat har under 0,8 i synskärpa (krävs för högre behörigheter)");
        }
        if (worstEye < 0.1) {
          newWarnings.push("Sämsta ögat har under 0,1 i synskärpa (krävs för högre behörigheter)");
        }
        break;

      case 'taxi':
        if (!isNaN(effectiveBoth) && effectiveBoth < 0.8) {
          newWarnings.push("Visusvärde båda ögon är under gränsvärdet 0,8 för taxiförarlegitimation");
        }
        break;
    }

    // Check correction requirements
    if (usesAnyCorrection &&
        (isNaN(withCorrectionBoth) && isNaN(withCorrectionRight) && isNaN(withCorrectionLeft))) {
      newWarnings.push("Mätning med korrektion krävs när glasögon/linser används");
    }

    // ±8 D-flagga: gäller endast glasögon, oavsett behörighet.
    if (measurements.uses_glasses && measurements.prescription_over_8d) {
      newWarnings.push("Glasstyrka över ±8,00 D – Transportstyrelsen måste informeras");
    }

    setWarnings(newWarnings);
  }, [measurements, licenseCategory]);

  const handleInputChange = (field: string, value: any) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAndContinue = async () => {
    const toNumberOrNull = (v: any) => {
      if (v === '' || v == null) return null;
      const n = parseLocaleFloat(v as any);
      return Number.isNaN(n) ? null : n;
    };

    // Styrkor sparas endast om patienten har glasögon OCH ±8 D-rutan är ikryssad.
    const includePrescription = measurements.uses_glasses && measurements.prescription_over_8d;
    const cleanedExistingNotes = String(examination?.notes ?? '')
      .split('\n')
      .filter((line) => !line.startsWith(LICENSE_CATEGORY_PREFIX))
      .join('\n')
      .replace(/^\n+/, '')
      .trim();

    const updates = {
      visual_acuity_both_eyes: toNumberOrNull(measurements.visual_acuity_both_eyes),
      visual_acuity_right_eye: toNumberOrNull(measurements.visual_acuity_right_eye),
      visual_acuity_left_eye: toNumberOrNull(measurements.visual_acuity_left_eye),
      visual_acuity_with_correction_both: toNumberOrNull(measurements.visual_acuity_with_correction_both),
      visual_acuity_with_correction_right: toNumberOrNull(measurements.visual_acuity_with_correction_right),
      visual_acuity_with_correction_left: toNumberOrNull(measurements.visual_acuity_with_correction_left),
      uses_glasses: Boolean(measurements.uses_glasses),
      uses_contact_lenses: Boolean(measurements.uses_contact_lenses),
      vision_below_limit: warnings.length > 0,
      // Glasögonstyrkor (sparas alltid – nullas ut om rutan inte är ikryssad eller linser).
      glasses_prescription_od_sph: includePrescription ? toNumberOrNull(measurements.glasses_prescription_od_sph) : null,
      glasses_prescription_od_cyl: includePrescription ? toNumberOrNull(measurements.glasses_prescription_od_cyl) : null,
      glasses_prescription_od_axis: includePrescription ? toNumberOrNull(measurements.glasses_prescription_od_axis) : null,
      glasses_prescription_od_add: includePrescription ? toNumberOrNull(measurements.glasses_prescription_od_add) : null,
      glasses_prescription_os_sph: includePrescription ? toNumberOrNull(measurements.glasses_prescription_os_sph) : null,
      glasses_prescription_os_cyl: includePrescription ? toNumberOrNull(measurements.glasses_prescription_os_cyl) : null,
      glasses_prescription_os_axis: includePrescription ? toNumberOrNull(measurements.glasses_prescription_os_axis) : null,
      glasses_prescription_os_add: includePrescription ? toNumberOrNull(measurements.glasses_prescription_os_add) : null,
      // Store the exact license button label from the patient flow without duplicating old rows.
      notes: `${LICENSE_CATEGORY_PREFIX}${LICENSE_CATEGORIES[licenseCategory].name}${cleanedExistingNotes ? `\n${cleanedExistingNotes}` : ''}`
    };

    try {
      await onSave(updates);
      toast({
        title: "Visusmätningar sparade",
        description: "Värdena har sparats och validering är klar",
        variant: "default"
      });
      onNext();
    } catch (error) {
      console.error('[VisualAcuityMeasurement] Save failed:', error);
      toast({
        title: "Kunde inte spara",
        description: "Ett fel uppstod vid sparning av visusmätningar",
        variant: "destructive"
      });
    }
  };

  // Visus-fält är valfria — optikern kan hoppa över stödet och ändå gå vidare.
  // (ServeIT är primär journal; portalen är endast stöd.)
  const hasAnyMeasurement = Boolean(
    measurements.visual_acuity_both_eyes ||
    measurements.visual_acuity_right_eye ||
    measurements.visual_acuity_left_eye
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visusmätningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License category selection */}
        <div className="space-y-3">
          <Label htmlFor="license-category">Typ av körkortsbehörighet</Label>
          <Select value={licenseCategory} onValueChange={(value: LicenseCategory) => { setUserOverridden(true); setLicenseCategory(value); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LICENSE_CATEGORIES).map(([key, category]) => (
                <SelectItem key={key} value={key}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Display requirements for selected category */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Krav för vald behörighetstyp:</p>
                <p className="text-sm">{LICENSE_CATEGORIES[licenseCategory].requirements}</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Information box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Mätinstruktioner:</p>
              <p className="text-sm">
                {LICENSE_CATEGORIES[licenseCategory].requirementGroup === 'lower' && "Mät synskärpa för båda ögonen tillsammans. Minst 0,5 krävs."}
                {LICENSE_CATEGORIES[licenseCategory].requirementGroup === 'higher' && "Mät synskärpa för varje öga separat. Minst 0,8 i bästa ögat och 0,1 i sämsta ögat krävs."}
                {LICENSE_CATEGORIES[licenseCategory].requirementGroup === 'taxi' && "Mät synskärpa för båda ögonen tillsammans. Minst 0,8 krävs för taxiförarlegitimation."}
              </p>
              <p className="text-xs text-muted-foreground">
                💡 VISUS-skala: 1,0 = normalsyn, 2,0 = exceptionellt bra syn. Minst 80% av tecknen måste läsas korrekt för varje värde.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main measurements - order: Right eye, Left eye, Both eyes (as opticians are trained) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="right-eye">Höger öga (OD)</Label>
            <Select 
              value={measurements.visual_acuity_right_eye.toString()} 
              onValueChange={(value) => handleInputChange('visual_acuity_right_eye', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj VISUS-värde" />
              </SelectTrigger>
              <SelectContent>
                {VISUS_SCALE.map((visus) => (
                  <SelectItem key={visus} value={visus}>
                    {visus.replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="left-eye">Vänster öga (OS)</Label>
            <Select 
              value={measurements.visual_acuity_left_eye.toString()} 
              onValueChange={(value) => handleInputChange('visual_acuity_left_eye', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj VISUS-värde" />
              </SelectTrigger>
              <SelectContent>
                {VISUS_SCALE.map((visus) => (
                  <SelectItem key={visus} value={visus}>
                    {visus.replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="both-eyes">Båda ögon</Label>
            <Select 
              value={measurements.visual_acuity_both_eyes.toString()} 
              onValueChange={(value) => handleInputChange('visual_acuity_both_eyes', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj VISUS-värde" />
              </SelectTrigger>
              <SelectContent>
                {VISUS_SCALE.map((visus) => (
                  <SelectItem key={visus} value={visus}>
                    {visus.replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Korrigering — radio-group enligt Transportstyrelsens enklare modell.
            Inga exakta styrkor behövs; det räcker att markera kategori. */}
        <div className="space-y-4">
          <h4 className="font-medium">Korrigering av synskärpa genom</h4>
          <RadioGroup
            value={
              measurements.uses_contact_lenses
                ? 'contacts'
                : measurements.uses_glasses
                  ? (measurements.prescription_over_8d ? 'glasses_over_8d' : 'glasses_under_8d')
                  : 'none'
            }
            onValueChange={(value) => {
              setMeasurements(prev => ({
                ...prev,
                uses_glasses: value === 'glasses_under_8d' || value === 'glasses_over_8d',
                uses_contact_lenses: value === 'contacts',
                prescription_over_8d: value === 'glasses_over_8d',
              }));
            }}
            className="space-y-2"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="none" id="corr-none" className="mt-1" />
              <Label htmlFor="corr-none" className="cursor-pointer font-normal">
                Ingen korrigering
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="glasses_under_8d" id="corr-glasses-under" className="mt-1" />
              <Label htmlFor="corr-glasses-under" className="cursor-pointer font-normal">
                Glasögon – inget glas har en styrka över ±8 dioptrier i den mest brytande meridianen
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="glasses_over_8d" id="corr-glasses-over" className="mt-1" />
              <Label htmlFor="corr-glasses-over" className="cursor-pointer font-normal">
                Glasögon – något av glasen har en styrka över ±8 dioptrier i den mest brytande meridianen
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="contacts" id="corr-contacts" className="mt-1" />
              <Label htmlFor="corr-contacts" className="cursor-pointer font-normal">
                Kontaktlinser
              </Label>
            </div>
          </RadioGroup>

          {/* Visus med korrektion — endast om något korrektionsalternativ är valt */}
          {(measurements.uses_glasses || measurements.uses_contact_lenses) && (
            <div className="space-y-4 pt-2">
              <h5 className="font-medium text-sm">Visus med korrektion</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="with-correction-right">Höger öga (OD)</Label>
                  <Select
                    value={measurements.visual_acuity_with_correction_right.toString()}
                    onValueChange={(value) => handleInputChange('visual_acuity_with_correction_right', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj VISUS-värde" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUS_SCALE.map((visus) => (
                        <SelectItem key={visus} value={visus}>{visus.replace('.', ',')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="with-correction-left">Vänster öga (OS)</Label>
                  <Select
                    value={measurements.visual_acuity_with_correction_left.toString()}
                    onValueChange={(value) => handleInputChange('visual_acuity_with_correction_left', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj VISUS-värde" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUS_SCALE.map((visus) => (
                        <SelectItem key={visus} value={visus}>{visus.replace('.', ',')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="with-correction-both">Båda ögon (OU)</Label>
                  <Select
                    value={measurements.visual_acuity_with_correction_both.toString()}
                    onValueChange={(value) => handleInputChange('visual_acuity_with_correction_both', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj VISUS-värde" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUS_SCALE.map((visus) => (
                        <SelectItem key={visus} value={visus}>{visus.replace('.', ',')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Navigation — visus är valfritt; "Hoppa över stöd" går vidare utan värden */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onNext}
            disabled={isSaving}
          >
            Hoppa över stöd
          </Button>
          <Button
            onClick={handleSaveAndContinue}
            disabled={isSaving || !hasAnyMeasurement}
          >
            {isSaving ? "Sparar..." : "Spara och fortsätt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};