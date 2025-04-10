
/**
 * This component displays and allows editing of patient information,
 * particularly the identifier (name/number) associated with an anamnesis entry.
 * It provides an interface for opticians to view, edit and save patient information.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save } from "lucide-react";

interface PatientInfoProps {
  patientIdentifier: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientIdentifier: (value: string) => void;
  savePatientIdentifier: () => void;
  status: string;
}

export const PatientInfo = ({
  patientIdentifier,
  isEditing,
  toggleEditing,
  setPatientIdentifier,
  savePatientIdentifier,
  status
}: PatientInfoProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Patientinformation</h3>
        {!isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleEditing}
            disabled={status === "completed" || status === "archived"}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Redigera
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              toggleEditing();
              setPatientIdentifier(patientIdentifier); // Reset to original value
            }}
          >
            Avbryt
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Label htmlFor="patientIdentifier">Patient (namn/nummer)</Label>
          <div className="flex gap-2">
            <Input
              id="patientIdentifier"
              value={patientIdentifier}
              onChange={(e) => setPatientIdentifier(e.target.value)}
              placeholder="T.ex. Anna Andersson eller P12345"
            />
            <Button onClick={savePatientIdentifier}>
              <Save className="h-4 w-4 mr-1" />
              Spara
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {patientIdentifier || "Ingen patientidentifierare angiven"}
        </p>
      )}
    </div>
  );
};
