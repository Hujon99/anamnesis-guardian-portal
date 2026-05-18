/**
 * ServeitTransferView
 *
 * Slutsteget i körkortsundersökningens app-flöde (steg 4 i
 * `DrivingLicenseExamination.tsx`). Visar den pedagogiska ServeIT-guiden
 * (via `ServeitInstructions` med `mode="guide"`) plus formulärdelen där
 * assistenten väljer bedömning + ansvarig optiker + (valfri) anteckning
 * och markerar att körkortskollen är skapad i ServeIT.
 *
 * Vid "Markera som skapad och sparad i ServeIT" sätts
 * `examination_status='completed'`, `completion_method='servit'` på
 * driving_license_examinations-raden via parent-komponentens `onSave`,
 * därefter tilldelas ansvarig optiker och ett mejl skickas via
 * edge-funktionen `notify-optician-driving-license`.
 *
 * All ren guide-UI bor i `ServeitInstructions.tsx` så att samma layout
 * kan återanvändas i visningsläget (DrivingLicenseResults).
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, ClipboardCheck, User } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import {
  OUTCOME_OPTIONS,
  type OutcomeValue,
  parseOutcomeFromNotes,
  parseLicenseCategoryFromNotes,
  combineNotesWithOutcome,
  getOutcomeLabel,
} from "./outcomeUtils";
import { RecommendationEngine } from "./RecommendationEngine";
import { ServeitInstructions } from "./ServeitInstructions";

interface ServeitTransferViewProps {
  examination: any;
  entry: AnamnesesEntry;
  onSave: (updates: any) => Promise<void>;
  onComplete: () => void;
  isSaving: boolean;
}

export const ServeitTransferView: React.FC<ServeitTransferViewProps> = ({
  examination,
  entry,
  onSave,
  onComplete,
  isSaving,
}) => {
  const initialParsed = parseOutcomeFromNotes(examination?.notes || "");
  const [notes, setNotes] = useState(initialParsed.rest);
  const [outcome, setOutcome] = useState<OutcomeValue | "">(initialParsed.outcome);
  const [selectedOpticianId, setSelectedOpticianId] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const { opticians, isLoading: loadingOpticians } = useOpticians();
  const { assignOptician } = useEntryMutations(entry.id);
  const { supabase } = useSupabaseClient();

  const isCompleted = examination?.examination_status === "completed";

  const handleConfirm = async () => {
    if (!outcome) {
      toast({
        title: "Bedömning saknas",
        description: "Välj utfall innan du markerar som skapad i ServeIT.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedOpticianId) {
      toast({
        title: "Ingen optiker vald",
        description: "Välj ansvarig optiker som ska få notisen.",
        variant: "destructive",
      });
      return;
    }
    const selectedOptician = opticians.find(
      (o) => o.clerk_user_id === selectedOpticianId,
    );
    if (!selectedOptician?.email) {
      toast({
        title: "E-post saknas",
        description: "Den valda optikern har ingen e-postadress.",
        variant: "destructive",
      });
      return;
    }

    const outcomeLabel = getOutcomeLabel(outcome);
    const licenseCategory = parseLicenseCategoryFromNotes(examination?.notes || "");
    const combinedNotes = combineNotesWithOutcome(outcome, notes, licenseCategory);

    try {
      await onSave({
        examination_status: "completed",
        completion_method: "servit",
        notes: combinedNotes,
      });

      await assignOptician(selectedOpticianId);

      try {
        const { error: emailError } = await supabase.functions.invoke(
          "notify-optician-driving-license",
          {
            body: {
              entryId: entry.id,
              opticianEmail: selectedOptician.email,
              appUrl: window.location.origin,
              completionMethod: "servit",
              outcomeLabel,
            },
          },
        );
        if (emailError) {
          console.error("[ServeitTransferView] Email error:", emailError);
        }
      } catch (mailErr) {
        console.error("[ServeitTransferView] Email exception:", mailErr);
      }

      setEmailSent(true);
      toast({
        title: "Markerad som skapad i ServeIT",
        description: `${getOpticianDisplayName(selectedOptician)} har notifierats.`,
      });
      onComplete();
    } catch (err: any) {
      console.error("[ServeitTransferView] Failed:", err);
      toast({
        title: "Kunde inte spara",
        description: err?.message || "Ett oväntat fel inträffade.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Skapa körkortskoll i ServeIT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-w-3xl">
        <ServeitInstructions
          examination={examination}
          entry={entry}
          mode="guide"
          emailSent={emailSent}
        />

        {/* Rekommendation / sammanfattning till optiker — följer med från tidigare steg */}
        <section aria-labelledby="recommendation-heading" className="space-y-2">
          <h3
            id="recommendation-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Rekommendation / sammanfattning till optiker
          </h3>
          <RecommendationEngine examination={examination} entry={entry} />
        </section>

        <Separator />

        {/* Bedömning + Optiker + Anteckning */}
        {!isCompleted && (
          <>
            <div className="space-y-2">
              <Label htmlFor="outcome-select" className="font-medium">
                Bedömning av assistent
              </Label>
              <Select
                value={outcome}
                onValueChange={(v) => setOutcome(v as OutcomeValue)}
                disabled={isSaving}
              >
                <SelectTrigger id="outcome-select">
                  <SelectValue placeholder="Välj utfall" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stöd för optikern. Slutligt beslut fattas i ServeIT.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="optician-select"
                className="font-medium flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Ansvarig optiker
              </Label>
              <Select
                value={selectedOpticianId}
                onValueChange={setSelectedOpticianId}
                disabled={loadingOpticians || isSaving}
              >
                <SelectTrigger id="optician-select">
                  <SelectValue
                    placeholder={
                      loadingOpticians ? "Laddar optiker..." : "Välj optiker"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {opticians.map((opt) => (
                    <SelectItem key={opt.id} value={opt.clerk_user_id}>
                      {getOpticianDisplayName(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servit-notes">Anteckningar (valfritt)</Label>
              <Textarea
                id="servit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isSaving}
                placeholder="T.ex. förtydligande till optikern..."
              />
            </div>
          </>
        )}

        {/* Primary CTA */}
        {isCompleted ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Markerad som skapad i ServeIT{" "}
              {examination?.updated_at
                ? new Date(examination.updated_at).toLocaleString("sv-SE")
                : ""}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onComplete} disabled={isSaving}>
              Avbryt
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving || !outcome || !selectedOpticianId}
            >
              {isSaving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isSaving
                ? "Sparar..."
                : "Markera som skapad och sparad i ServeIT"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
