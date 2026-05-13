## Problem

I `ServitJournalDialog` (öppnas via "Journalför i ServeIT") känns ordningen ologisk för optikern. Önskat arbetsflöde är:

1. Läs anamnesen / formuläret (underlag)
2. Sätt bedömningen (utfall)
3. Journalför (kundnummer, ansvarig optiker, anteckning, slutför)

## Lösning

Justera ordningen på sektionerna i `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` (inom `<div className="flex-1 overflow-y-auto ...">`). Ingen logikförändring — endast omplacering av JSX-block.

### Ny ordning

```text
[Patientkort]  (oförändrat, högst upp)

1. Anamnessvar — för in i ServeIT
   (FormAnswersDisplay i scrollbart kort)

2. Bedömning av assistent  ← flyttas hit (just nu längst ner)
   - Select med OUTCOME_OPTIONS
   - Hjälptext "Stöd för optikern…"

—— Avdelare ——  (border-t)

3. Journalföring i ServeIT
   - Kundnummer (obligatoriskt)
   - Ansvarig optiker (obligatoriskt)
   - "Lägg till anteckning"-toggle / Textarea

[DialogFooter med Avbryt + Slutför]  (oförändrat)
```

### Konkret ändring

I filen `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx`:

- Behåll `Patient context card` (rad ~289) och `Anamnessvar`-sektionen (rad ~313) först.
- Flytta `Bedömning`-blocket (nuvarande rad ~439–472) till direkt efter Anamnessvar.
- Lägg en visuell avdelare (`border-t border-border/60 pt-4`) ovanför journalföringsblocken.
- Lämna kvar Kundnummer → Optiker → Anteckning i den ordningen efter avdelaren.
- Inga ändringar i `handleConfirm`, validering, state eller styling utöver placeringen.
- Uppdatera filens topp-kommentar (steg 1 i flödet) så ordningen i texten matchar UI:t.

## Verifiering

- Öppna ett körkortsärende → klicka "Journalför i ServeIT".
- Bekräfta visuellt att sektionerna kommer i ordning: Patient → Anamnes → Bedömning → Kundnummer → Optiker → (Anteckning) → Slutför-knapp.
- Skicka in en testpost och bekräfta att kundnummer + bedömning fortfarande sparas och mejl skickas (ingen funktionell regression).

## Filer

- `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` (endast omordning av JSX + kommentar)
