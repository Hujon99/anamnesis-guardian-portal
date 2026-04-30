/**
 * ServitJournalDialog
 *
 * Dialog som låter optiker/assistent markera en körkortsundersökning som
 * "Journalförd direkt i Servit" – utan att gå igenom appens visus/ID-flöde.
 *
 * Flödet:
 *  1. Användaren anger Servit-kundnummer (obligatoriskt) och valfri anteckning.
 *  2. Användaren väljer ansvarig optiker som ska få notisen.
 *  3. Vi skapar/uppdaterar en rad i `driving_license_examinations` med
 *     completion_method = 'servit', servit_customer_number = <input>,
 *     examination_status = 'completed'.
 *  4. Anamnes-posten tilldelas vald optiker via `useEntryMutations.assignOptician`.
 *  5. Edge-funktionen `notify-optician-driving-license` skickar mejl med
 *     Servit-varianten (innehåller kundnumret).
 *
 * Komplement till `ExaminationSummary.tsx` som hanterar app-spåret.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ClipboardCheck } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";

interface ServitJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AnamnesesEntry;
  onCompleted?: () => void;
}

export const ServitJournalDialog: React.FC<ServitJournalDialogProps> = ({
  open,
  onOpenChange,
  entry,
  onCompleted,
}) => {
  const [customerNumber, setCustomerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedOpticianId, setSelectedOpticianId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { opticians, isLoading: loadingOpticians } = useOpticians();
  const { assignOptician } = useEntryMutations(entry.id);
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { user } = useUser();

  const reset = () => {
    setCustomerNumber("");
    setNotes("");
    setSelectedOpticianId("");
  };

  const handleConfirm = async () => {
    const trimmed = customerNumber.trim();
    if (!trimmed) {
      toast({
        title: "Kundnummer saknas",
        description: "Ange Servit-kundnummer för att fortsätta.",
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
    if (!supabase || !organization?.id) {
      toast({
        title: "Inte redo",
        description: "Saknar databasanslutning. Försök igen.",
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
        description: "Den valda optikern saknar e-postadress.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Upsert examination-rad. Vi gör en SELECT först för att hantera
      // både "ny" och "redan påbörjad" på ett tydligt sätt.
      const { data: existing, error: fetchErr } = await supabase
        .from("driving_license_examinations")
        .select("id")
        .eq("entry_id", entry.id)
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const payload = {
        entry_id: entry.id,
        organization_id: organization.id,
        examination_status: "completed" as const,
        completion_method: "servit",
        servit_customer_number: trimmed,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
      };

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("driving_license_examinations")
          .update(payload)
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("driving_license_examinations")
          .insert(payload);
        if (insErr) throw insErr;
      }

      // Tilldela ansvarig optiker (sätter optician_id på anamnes_entries)
      await assignOptician(selectedOpticianId);

      // Skicka mejl med Servit-variant
      try {
        const { error: emailError } = await supabase.functions.invoke(
          "notify-optician-driving-license",
          {
            body: {
              entryId: entry.id,
              opticianEmail: selectedOptician.email,
              appUrl: window.location.origin,
              completionMethod: "servit",
              servitCustomerNumber: trimmed,
            },
          },
        );
        if (emailError) {
          console.error("[ServitJournalDialog] Email error:", emailError);
        }
      } catch (mailErr) {
        console.error("[ServitJournalDialog] Email exception:", mailErr);
      }

      toast({
        title: "Journalförd i Servit",
        description: `Kundnummer ${trimmed} sparat och ${getOpticianDisplayName(selectedOptician)} har notifierats.`,
      });

      reset();
      onOpenChange(false);
      onCompleted?.();
    } catch (err: any) {
      console.error("[ServitJournalDialog] Failed:", err);
      toast({
        title: "Kunde inte spara",
        description: err?.message || "Ett oväntat fel inträffade.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isSaving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Journalför i Servit
          </DialogTitle>
          <DialogDescription>
            Använd detta när undersökningen redan är genomförd och journalförd
            direkt i Servit. Optikern får ett mejl med kundnumret och nästa
            steg (granska och skicka intyg till Transportstyrelsen).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="servit-customer-number">
              Kundnummer i Servit <span className="text-destructive">*</span>
            </Label>
            <Input
              id="servit-customer-number"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
              placeholder="t.ex. 12345"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servit-optician">
              Ansvarig optiker <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedOpticianId}
              onValueChange={setSelectedOpticianId}
              disabled={loadingOpticians || isSaving}
            >
              <SelectTrigger id="servit-optician">
                <SelectValue
                  placeholder={
                    loadingOpticians ? "Laddar optiker..." : "Välj optiker"
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
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
              placeholder="T.ex. förtydligande till optikern..."
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Avbryt
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Bekräfta journalföring
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
