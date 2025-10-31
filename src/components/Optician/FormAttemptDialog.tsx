/**
 * Dialog component that asks if the customer attempted to fill the form online.
 * This helps track failed submission attempts for debugging and analytics.
 * Part of the direct form creation flow in the optician interface.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface FormAttemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { attempted: boolean; description?: string }) => void;
}

const FormAttemptDialog: React.FC<FormAttemptDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [attempted, setAttempted] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [commonIssues, setCommonIssues] = useState<string[]>([]);

  const commonProblems = [
    { id: "technical", label: "Tekniskt fel (app kraschade, fryste, etc.)" },
    { id: "link", label: "Kunde inte hitta eller öppna länken" },
    { id: "confused", label: "Förstod inte hur formuläret fungerade" },
    { id: "time", label: "Hade inte tid att slutföra" },
    { id: "forgot", label: "Glömde bort att fylla i" },
    { id: "device", label: "Problem med telefon/dator" },
  ];

  const handleConfirm = () => {
    if (attempted === null) return;
    
    // Build description from common issues + custom text
    let finalDescription = description.trim();
    if (attempted && commonIssues.length > 0) {
      const issueLabels = commonIssues
        .map(id => commonProblems.find(p => p.id === id)?.label)
        .filter(Boolean)
        .join(", ");
      finalDescription = finalDescription 
        ? `${issueLabels}. Ytterligare detaljer: ${finalDescription}`
        : issueLabels;
    }
    
    onConfirm({
      attempted,
      description: attempted && finalDescription ? finalDescription : undefined,
    });
    
    // Reset state
    setAttempted(null);
    setDescription("");
    setCommonIssues([]);
  };

  const handleCancel = () => {
    setAttempted(null);
    setDescription("");
    setCommonIssues([]);
    onOpenChange(false);
  };

  const toggleCommonIssue = (issueId: string) => {
    setCommonIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-8">
        <DialogHeader className="space-y-3">
          <DialogTitle>Formulärförsök</DialogTitle>
          <DialogDescription className="text-base">
            Har kunden försökt fylla i formuläret hemma/online?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6 px-2">
          {/* Selection Buttons */}
          <div className="grid grid-cols-2 gap-6">
            <Button
              type="button"
              variant={attempted === true ? "default" : "outline"}
              size="lg"
              className="h-24 flex flex-col gap-2"
              onClick={() => setAttempted(true)}
            >
              <CheckCircle2 className="h-8 w-8" />
              <span className="font-semibold">Ja, försökte fylla i</span>
            </Button>
            
            <Button
              type="button"
              variant={attempted === false ? "default" : "outline"}
              size="lg"
              className="h-24 flex flex-col gap-2"
              onClick={() => setAttempted(false)}
            >
              <XCircle className="h-8 w-8" />
              <span className="font-semibold">Nej, första gången</span>
            </Button>
          </div>

          {/* Detailed failure information - only shown if attempted */}
          {attempted === true && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 mx-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="leading-relaxed">
                  <strong>Viktigt för felsökning:</strong> Ju mer detaljerad information du ger, desto bättre kan vi förbättra systemet.
                  Försök att inkludera specifika detaljer om vad som hände.
                </AlertDescription>
              </Alert>

              {/* Common Issues Checkboxes */}
              <div className="space-y-4 px-2">
                <Label className="text-base font-semibold">
                  Välj vanliga problem (valfritt, välj alla som passar):
                </Label>
                <div className="space-y-3 pl-2">
                  {commonProblems.map((problem) => (
                    <div key={problem.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={problem.id}
                        checked={commonIssues.includes(problem.id)}
                        onCheckedChange={() => toggleCommonIssue(problem.id)}
                      />
                      <label
                        htmlFor={problem.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {problem.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-4 px-2">
                <Label htmlFor="failure-description" className="text-base font-semibold">
                  Detaljerad beskrivning: <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Beskriv så specifikt som möjligt vad som gick fel. Inkludera gärna:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2 ml-4">
                  <li>Vilken enhet använde kunden? (iPhone, Android, dator)</li>
                  <li>Vad hände exakt? (kraschade appen, frös sidan, felmeddelande visades?)</li>
                  <li>Vid vilket steg i formuläret hände problemet?</li>
                  <li>Har kunden försökt flera gånger?</li>
                  <li>Eventuella felmeddelanden eller konstigt beteende?</li>
                </ul>
                <Textarea
                  id="failure-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Exempel: 'Kunden använde iPhone 12. När hon försökte öppna länken i SMS så öppnades appen men den visade bara en vit skärm. Hon försökte starta om telefonen men samma problem. Ingen felkod visades.'"
                  rows={6}
                  className="resize-none mt-3"
                />
                <p className="text-sm font-medium text-amber-600 flex items-start gap-2 mt-3">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>Undvik generella beskrivningar som "fungerade inte" - var så specifik som möjligt!</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-8 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="min-w-[100px]"
          >
            Tillbaka
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              attempted === null || 
              (attempted === true && !description.trim() && commonIssues.length === 0)
            }
            className="min-w-[140px]"
          >
            {attempted === true && !description.trim() && commonIssues.length === 0 
              ? "Vänligen beskriv problemet" 
              : "Fortsätt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormAttemptDialog;
