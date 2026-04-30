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
 *
 * UI: Blue Pulse-konceptet — gradient-header (primary → accent-teal), patientkort
 * med kontext, stort monospace-fält för kundnummer, gradient-CTA med glow.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Loader2,
  ClipboardCheck,
  Hash,
  UserRound,
  StickyNote,
  Plus,
  Calendar,
  Mail,
  Gavel,
} from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { toast } from "@/hooks/use-toast";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
import { useEntryMutations } from "@/hooks/useEntryMutations";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import {
  OUTCOME_OPTIONS,
  type OutcomeValue,
  combineNotesWithOutcome,
  getOutcomeLabel,
} from "./outcomeUtils";
import { cn } from "@/lib/utils";

interface ServitJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AnamnesesEntry;
  onCompleted?: () => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

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
  const [showNotes, setShowNotes] = useState(false);

  const { opticians, isLoading: loadingOpticians } = useOpticians();
  const { assignOptician } = useEntryMutations(entry.id);
  const { supabase } = useSupabaseClient();
  const { organization } = useOrganization();
  const { user } = useUser();

  const reset = () => {
    setCustomerNumber("");
    setNotes("");
    setSelectedOpticianId("");
    setShowNotes(false);
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

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trigger = document.getElementById("servit-optician");
      trigger?.focus();
    }
  };

  const patientName = entry.first_name?.trim() || "Okänd patient";
  const bookingDate = entry.booking_date
    ? new Date(entry.booking_date).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isSaving) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        {/* Gradient header */}
        <div
          className="relative px-6 pt-7 pb-6 text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
              <ClipboardCheck className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold leading-tight">
                Journalför i Servit
              </h2>
              <p className="text-sm text-white/85 mt-1 leading-snug">
                Optikern får ett mejl med kundnumret och nästa steg
                (granska & skicka intyg till Transportstyrelsen).
              </p>
            </div>
          </div>

          {/* Saving progress strip */}
          {isSaving && (
            <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-white/10">
              <div className="h-full w-1/3 bg-white/80 animate-[shimmer_1.2s_ease-in-out_infinite]" />
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Patient context card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {getInitials(patientName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">
                {patientName}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {bookingDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {bookingDate}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  Körkort
                </span>
              </div>
            </div>
          </div>

          {/* Customer number — hero field */}
          <div className="space-y-2">
            <Label
              htmlFor="servit-customer-number"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <Hash className="h-3.5 w-3.5 text-accent" />
              Kundnummer i Servit
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-mono text-base pointer-events-none">
                #
              </span>
              <Input
                id="servit-customer-number"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                onKeyDown={handleNumberKeyDown}
                placeholder="t.ex. 12345"
                autoFocus
                disabled={isSaving}
                aria-required="true"
                className={cn(
                  "h-12 pl-9 pr-3 text-lg font-mono tracking-wide transition-colors duration-150",
                  customerNumber.trim() &&
                    "border-accent/60 focus-visible:ring-accent/40",
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground pl-0.5">
              Numret som visas i Servit för denna patient.
            </p>
          </div>

          {/* Optiker */}
          <div className="space-y-2">
            <Label
              htmlFor="servit-optician"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <UserRound className="h-3.5 w-3.5 text-accent" />
              Ansvarig optiker
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedOpticianId}
              onValueChange={setSelectedOpticianId}
              disabled={loadingOpticians || isSaving}
            >
              <SelectTrigger
                id="servit-optician"
                className="h-11"
                aria-required="true"
              >
                <SelectValue
                  placeholder={
                    loadingOpticians ? "Laddar optiker..." : "Välj optiker"
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                {opticians.map((opt) => {
                  const display = getOpticianDisplayName(opt);
                  return (
                    <SelectItem key={opt.id} value={opt.clerk_user_id}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                          {getInitials(display)}
                        </div>
                        <span className="truncate">{display}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedOpticianId && (
              <p className="text-xs text-muted-foreground pl-0.5 inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Får mejl direkt vid bekräftelse.
              </p>
            )}
          </div>

          {/* Collapsible notes */}
          {showNotes ? (
            <div className="space-y-2 animate-fade-in">
              <Label
                htmlFor="servit-notes"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <StickyNote className="h-3.5 w-3.5 text-accent" />
                Anteckningar
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (valfritt)
                </span>
              </Label>
              <Textarea
                id="servit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="T.ex. förtydligande till optikern..."
                disabled={isSaving}
                className="resize-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors duration-150"
            >
              <Plus className="h-3.5 w-3.5" />
              Lägg till anteckning
            </button>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="sm:w-auto"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving}
            className={cn(
              "sm:w-auto text-white border-0 transition-all duration-200",
              "hover:shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5",
              "active:translate-y-0",
            )}
            style={{ background: "var(--gradient-primary)" }}
          >
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
