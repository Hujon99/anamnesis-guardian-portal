
/**
 * This component displays and allows editing of patient information,
 * particularly the email address associated with an anamnesis entry.
 * It provides an interface for opticians to view, edit and save patient contact information.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save } from "lucide-react";

interface PatientInfoProps {
  patientEmail: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientEmail: (value: string) => void;
  savePatientEmail: () => void;
  status: string;
}

export const PatientInfo = ({
  patientEmail,
  isEditing,
  toggleEditing,
  setPatientEmail,
  savePatientEmail,
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
              setPatientEmail(patientEmail); // Reset to original value
            }}
          >
            Avbryt
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Label htmlFor="patientEmail">Patientens e-post</Label>
          <div className="flex gap-2">
            <Input
              id="patientEmail"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="patient@exempel.se"
            />
            <Button onClick={savePatientEmail}>
              <Save className="h-4 w-4 mr-1" />
              Spara
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {patientEmail || "Ingen e-post angiven"}
        </p>
      )}
    </div>
  );
};
