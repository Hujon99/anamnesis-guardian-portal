
/**
 * This component displays and allows editing of patient information,
 * particularly the identifier (reference number) associated with an anamnesis entry.
 * It provides an interface for opticians to view, edit and save patient reference information.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Referensnummer</h3>
          {patientIdentifier && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              {patientIdentifier}
            </Badge>
          )}
        </div>
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
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="patientIdentifier">
              Referensnummer för kunduppslagning
            </Label>
            <p className="text-sm text-muted-foreground">
              Lägg till ett referensnummer som kan användas för att hitta kunden i ert eget system.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="patientIdentifier"
              value={patientIdentifier}
              onChange={(e) => setPatientIdentifier(e.target.value)}
              placeholder="T.ex. K12345, Anna Andersson, eller personnummer"
              className="flex-1"
            />
            <Button onClick={savePatientIdentifier}>
              <Save className="h-4 w-4 mr-1" />
              Spara
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Referensnummer för kunduppslagning i ert system
          </p>
          {patientIdentifier ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-blue-900">{patientIdentifier}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-gray-500 text-sm">
                Inget referensnummer angivet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Klicka på "Redigera" för att lägga till
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
