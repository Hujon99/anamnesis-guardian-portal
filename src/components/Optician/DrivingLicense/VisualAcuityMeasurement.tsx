/**
 * Component for conducting visual acuity measurements during driving license examinations.
 * Handles input for both eyes separately, with/without correction, and provides
 * real-time validation with automatic warnings when vision is below required limits.
 * Validates based on Swedish driving license vision requirements for different license categories.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, AlertTriangle, Info } from "lucide-react";

interface VisualAcuityMeasurementProps {
  examination: any;
  entry?: any; // Form entry with answers
  onSave: (updates: any) => Promise<void>;
  onNext: () => void;
  isSaving: boolean;
}

// License category types for vision requirements
type LicenseCategory = 'lower' | 'higher' | 'taxi';

const LICENSE_CATEGORIES = {
  lower: {
    name: 'Lägre behörigheter (AM, A1, A2, A, B, BE, traktor)',
    requirements: 'Minst 0,5 binokulart (båda ögonen) - med eller utan glasögon/linser'
  },
  higher: {
    name: 'Högre behörigheter (C1, C1E, C, CE, D1, D1E, D, DE)',
    requirements: 'Minst 0,8 i bästa ögat och minst 0,1 i sämsta ögat'
  },
  taxi: {
    name: 'Taxiförarlegitimation',
    requirements: 'Minst 0,8 binokulart'
  }
};

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

  // Try to detect license category from form answers
  const detectedLicenseCategory = React.useMemo((): LicenseCategory => {
    if (!entry?.answers) return 'lower'; // Default to lower category
    
    const answers = entry.answers;
    
    // Look for license type information in form answers
    for (const [key, value] of Object.entries(answers)) {
      const keyLower = key.toLowerCase();
      const valueLower = String(value).toLowerCase();
      
      // Check for higher category licenses
      if (keyLower.includes('körkortstyp') || keyLower.includes('behörighet') || keyLower.includes('license')) {
        if (valueLower.includes('c1') || valueLower.includes('ce') || valueLower.includes('d1') || 
            valueLower.includes('de') || valueLower.includes('lastbil') || valueLower.includes('buss')) {
          return 'higher';
        }
        if (valueLower.includes('taxi')) {
          return 'taxi';
        }
      }
    }
    
    return 'lower'; // Default to lower category
  }, [entry?.answers]);

  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>(detectedLicenseCategory);
  const [measurements, setMeasurements] = useState({
    visual_acuity_both_eyes: examination?.visual_acuity_both_eyes || '',
    visual_acuity_right_eye: examination?.visual_acuity_right_eye || '',
    visual_acuity_left_eye: examination?.visual_acuity_left_eye || '',
    visual_acuity_with_correction_both: examination?.visual_acuity_with_correction_both || '',
    visual_acuity_with_correction_right: examination?.visual_acuity_with_correction_right || '',
    visual_acuity_with_correction_left: examination?.visual_acuity_with_correction_left || '',
    uses_correction: examination?.uses_glasses || examination?.uses_contact_lenses || usesCorrection,
    correction_type: examination?.correction_type || (usesCorrection ? 'glasses_or_lenses' : 'none')
  });

  const [warnings, setWarnings] = useState<string[]>([]);

  // Validate measurements based on license category and generate warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    const bothEyes = parseFloat(measurements.visual_acuity_both_eyes);
    const rightEye = parseFloat(measurements.visual_acuity_right_eye);
    const leftEye = parseFloat(measurements.visual_acuity_left_eye);
    const withCorrectionBoth = parseFloat(measurements.visual_acuity_with_correction_both);
    const withCorrectionRight = parseFloat(measurements.visual_acuity_with_correction_right);
    const withCorrectionLeft = parseFloat(measurements.visual_acuity_with_correction_left);

    // Use corrected values if correction is used, otherwise use uncorrected
    const effectiveBoth = measurements.uses_correction && withCorrectionBoth ? withCorrectionBoth : bothEyes;
    const effectiveRight = measurements.uses_correction && withCorrectionRight ? withCorrectionRight : rightEye;
    const effectiveLeft = measurements.uses_correction && withCorrectionLeft ? withCorrectionLeft : leftEye;

    // Apply validation rules based on license category
    switch (licenseCategory) {
      case 'lower':
        // Lägre behörigheter: Minst 0,5 binokulart
        if (effectiveBoth && effectiveBoth < 0.5) {
          newWarnings.push("Visusvärde båda ögon är under gränsvärdet 0,5 för lägre behörigheter");
        }
        break;
        
      case 'higher':
        // Högre behörigheter: 0,8 i bästa ögat, 0,1 i sämsta ögat
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
        // Taxiförarlegitimation: Minst 0,8 binokulart
        if (effectiveBoth && effectiveBoth < 0.8) {
          newWarnings.push("Visusvärde båda ögon är under gränsvärdet 0,8 för taxiförarlegitimation");
        }
        break;
    }

    // Check correction requirements
    if (measurements.uses_correction && 
        (!withCorrectionBoth && !withCorrectionRight && !withCorrectionLeft)) {
      newWarnings.push("Mätning med korrektion krävs när glasögon/linser används");
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
    const updates = {
      ...measurements,
      // Map back to database fields
      uses_glasses: measurements.uses_correction,
      uses_contact_lenses: measurements.uses_correction,
      vision_below_limit: warnings.length > 0, // Any warning means vision issue
      visual_acuity_both_eyes: parseFloat(measurements.visual_acuity_both_eyes) || null,
      visual_acuity_right_eye: parseFloat(measurements.visual_acuity_right_eye) || null,
      visual_acuity_left_eye: parseFloat(measurements.visual_acuity_left_eye) || null,
      visual_acuity_with_correction_both: parseFloat(measurements.visual_acuity_with_correction_both) || null,
      visual_acuity_with_correction_right: parseFloat(measurements.visual_acuity_with_correction_right) || null,
      visual_acuity_with_correction_left: parseFloat(measurements.visual_acuity_with_correction_left) || null,
      // Store license category for reference
      notes: `Behörighetstyp: ${LICENSE_CATEGORIES[licenseCategory].name}${examination?.notes ? `\n${examination.notes}` : ''}`
    };

    await onSave(updates);
    onNext();
  };

  const isFormValid = measurements.visual_acuity_both_eyes && 
                      measurements.visual_acuity_right_eye && 
                      measurements.visual_acuity_left_eye;

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
          <Select value={licenseCategory} onValueChange={(value: LicenseCategory) => setLicenseCategory(value)}>
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
            <div className="space-y-1">
              <p className="font-medium">Mätinstruktioner:</p>
              <p className="text-sm">
                {licenseCategory === 'lower' && "Mät synskärpa för båda ögonen tillsammans. Minst 0,5 krävs."}
                {licenseCategory === 'higher' && "Mät synskärpa för varje öga separat. Minst 0,8 i bästa ögat och 0,1 i sämsta ögat krävs."}
                {licenseCategory === 'taxi' && "Mät synskärpa för båda ögonen tillsammans. Minst 0,8 krävs för taxiförarlegitimation."}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main measurements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="both-eyes">Båda ögon</Label>
            <Input
              id="both-eyes"
              type="number"
              step="0.1"
              min="0"
              max="2.0"
              placeholder="1.0"
              value={measurements.visual_acuity_both_eyes}
              onChange={(e) => handleInputChange('visual_acuity_both_eyes', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="right-eye">Höger öga</Label>
            <Input
              id="right-eye"
              type="number"
              step="0.1"
              min="0"
              max="2.0"
              placeholder="0.8"
              value={measurements.visual_acuity_right_eye}
              onChange={(e) => handleInputChange('visual_acuity_right_eye', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="left-eye">Vänster öga</Label>
            <Input
              id="left-eye"
              type="number"
              step="0.1"
              min="0"
              max="2.0"
              placeholder="0.8"
              value={measurements.visual_acuity_left_eye}
              onChange={(e) => handleInputChange('visual_acuity_left_eye', e.target.value)}
            />
          </div>
        </div>

        {/* Correction settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Korrektion</h4>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="correction"
              checked={measurements.uses_correction}
              onCheckedChange={(checked) => {
                handleInputChange('uses_correction', checked);
                handleInputChange('correction_type', checked ? 'glasses_or_lenses' : 'none');
              }}
            />
            <Label htmlFor="correction">Använder glasögon eller kontaktlinser</Label>
          </div>

          {/* Measurements with correction */}
          {measurements.uses_correction && (
            <div className="space-y-4">
              <h5 className="font-medium text-sm">Visus med korrektion</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="with-correction-both">Båda ögon</Label>
                  <Input
                    id="with-correction-both"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2.0"
                    placeholder="1.2"
                    value={measurements.visual_acuity_with_correction_both}
                    onChange={(e) => handleInputChange('visual_acuity_with_correction_both', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="with-correction-right">Höger öga</Label>
                  <Input
                    id="with-correction-right"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2.0"
                    placeholder="1.0"
                    value={measurements.visual_acuity_with_correction_right}
                    onChange={(e) => handleInputChange('visual_acuity_with_correction_right', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="with-correction-left">Vänster öga</Label>
                  <Input
                    id="with-correction-left"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2.0"
                    placeholder="1.0"
                    value={measurements.visual_acuity_with_correction_left}
                    onChange={(e) => handleInputChange('visual_acuity_with_correction_left', e.target.value)}
                  />
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

        {/* Navigation */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? "Sparar..." : "Spara och fortsätt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};