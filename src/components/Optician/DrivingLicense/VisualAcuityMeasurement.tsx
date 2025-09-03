/**
 * Component for conducting visual acuity measurements during driving license examinations.
 * Handles input for both eyes separately, with/without correction, and provides
 * real-time validation with automatic warnings when vision is below required limits.
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
  onSave: (updates: any) => Promise<void>;
  onNext: () => void;
  isSaving: boolean;
}

export const VisualAcuityMeasurement: React.FC<VisualAcuityMeasurementProps> = ({
  examination,
  onSave,
  onNext,
  isSaving
}) => {
  const [measurements, setMeasurements] = useState({
    visual_acuity_both_eyes: examination?.visual_acuity_both_eyes || '',
    visual_acuity_right_eye: examination?.visual_acuity_right_eye || '',
    visual_acuity_left_eye: examination?.visual_acuity_left_eye || '',
    visual_acuity_with_correction_both: examination?.visual_acuity_with_correction_both || '',
    visual_acuity_with_correction_right: examination?.visual_acuity_with_correction_right || '',
    visual_acuity_with_correction_left: examination?.visual_acuity_with_correction_left || '',
    uses_glasses: examination?.uses_glasses || false,
    uses_contact_lenses: examination?.uses_contact_lenses || false,
    correction_type: examination?.correction_type || 'none'
  });

  const [warnings, setWarnings] = useState<string[]>([]);

  // Validate measurements and generate warnings
  useEffect(() => {
    const newWarnings: string[] = [];

    const bothEyes = parseFloat(measurements.visual_acuity_both_eyes);
    const rightEye = parseFloat(measurements.visual_acuity_right_eye);
    const leftEye = parseFloat(measurements.visual_acuity_left_eye);
    const withCorrectionBoth = parseFloat(measurements.visual_acuity_with_correction_both);
    const withCorrectionRight = parseFloat(measurements.visual_acuity_with_correction_right);
    const withCorrectionLeft = parseFloat(measurements.visual_acuity_with_correction_left);

    // Check if any measurement is below 1.0
    if (bothEyes && bothEyes < 1.0) {
      newWarnings.push("Visus båda ögon är under gränsvärdet 1.0");
    }
    if (rightEye && rightEye < 0.5) {
      newWarnings.push("Visus höger öga är under gränsvärdet 0.5");
    }
    if (leftEye && leftEye < 0.5) {
      newWarnings.push("Visus vänster öga är under gränsvärdet 0.5");
    }

    // Check correction requirements
    if ((measurements.uses_glasses || measurements.uses_contact_lenses) && 
        (!withCorrectionBoth && !withCorrectionRight && !withCorrectionLeft)) {
      newWarnings.push("Mätning med korrektion krävs när glasögon/linser används");
    }

    // Check correction measurements against limits
    if (withCorrectionBoth && withCorrectionBoth < 1.0) {
      newWarnings.push("Visus med korrektion båda ögon är under gränsvärdet 1.0");
    }
    if (withCorrectionRight && withCorrectionRight < 0.5) {
      newWarnings.push("Visus med korrektion höger öga är under gränsvärdet 0.5");
    }
    if (withCorrectionLeft && withCorrectionLeft < 0.5) {
      newWarnings.push("Visus med korrektion vänster öga är under gränsvärdet 0.5");
    }

    setWarnings(newWarnings);
  }, [measurements]);

  const handleInputChange = (field: string, value: any) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAndContinue = async () => {
    const updates = {
      ...measurements,
      vision_below_limit: warnings.some(w => w.includes("under gränsvärdet")),
      visual_acuity_both_eyes: parseFloat(measurements.visual_acuity_both_eyes) || null,
      visual_acuity_right_eye: parseFloat(measurements.visual_acuity_right_eye) || null,
      visual_acuity_left_eye: parseFloat(measurements.visual_acuity_left_eye) || null,
      visual_acuity_with_correction_both: parseFloat(measurements.visual_acuity_with_correction_both) || null,
      visual_acuity_with_correction_right: parseFloat(measurements.visual_acuity_with_correction_right) || null,
      visual_acuity_with_correction_left: parseFloat(measurements.visual_acuity_with_correction_left) || null
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
        {/* Information box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Mät visus för båda ögonen tillsammans samt varje öga separat. 
            Gränsvärden: Båda ögon ≥ 1.0, varje öga ≥ 0.5.
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
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="glasses"
                checked={measurements.uses_glasses}
                onCheckedChange={(checked) => {
                  handleInputChange('uses_glasses', checked);
                  if (checked && !measurements.uses_contact_lenses) {
                    handleInputChange('correction_type', 'glasses');
                  } else if (!checked && !measurements.uses_contact_lenses) {
                    handleInputChange('correction_type', 'none');
                  }
                }}
              />
              <Label htmlFor="glasses">Använder glasögon</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lenses"
                checked={measurements.uses_contact_lenses}
                onCheckedChange={(checked) => {
                  handleInputChange('uses_contact_lenses', checked);
                  if (checked && !measurements.uses_glasses) {
                    handleInputChange('correction_type', 'contact_lenses');
                  } else if (!checked && !measurements.uses_glasses) {
                    handleInputChange('correction_type', 'none');
                  }
                }}
              />
              <Label htmlFor="lenses">Använder kontaktlinser</Label>
            </div>
          </div>

          {/* Correction type selection */}
          {(measurements.uses_glasses && measurements.uses_contact_lenses) && (
            <div className="space-y-2">
              <Label>Typ av korrektion idag</Label>
              <Select 
                value={measurements.correction_type} 
                onValueChange={(value) => handleInputChange('correction_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="glasses">Glasögon</SelectItem>
                  <SelectItem value="contact_lenses">Kontaktlinser</SelectItem>
                  <SelectItem value="both">Båda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Measurements with correction */}
          {(measurements.uses_glasses || measurements.uses_contact_lenses) && (
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