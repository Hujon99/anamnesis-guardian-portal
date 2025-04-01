
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save } from "lucide-react";

interface PatientInfoProps {
  patientEmail: string;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  setPatientEmail: (value: string) => void;
  savePatientEmail: () => void;
}

export const PatientInfo = ({
  patientEmail,
  isEditing,
  setIsEditing,
  setPatientEmail,
  savePatientEmail
}: PatientInfoProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Patientinformation</h3>
        {!isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Redigera
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsEditing(false);
              setPatientEmail("");
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
