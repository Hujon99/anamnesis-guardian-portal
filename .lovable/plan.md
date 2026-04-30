# Rätta stavning: Servit → ServeIT

Användaren har klargjort att det externa systemet stavas **ServeIT** (inte "Servit"). Vi byter stavning i all text som visas för användaren (UI, mejl, kommentarer, dokumentation), men behåller interna kodidentifierare (filnamn, variabler, DB-kolumner, enum-värden, element-id:n) som de är. Att byta interna identifierare skulle kräva DB-migration och refaktor utan funktionellt värde.

## Vad ändras (användarsynlig text)

**UI-strängar (svenska):**
- `src/components/Optician/AnamnesisListItem.tsx` — "Journalförd i Servit", "Journalför i Servit"
- `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` — rubrik, beskrivningar, fältetiketter, hjälptexter, toast-meddelanden ("Journalför i Servit", "Kundnummer i Servit", "Slutligt beslut fattas i Servit", "Numret som visas i Servit...", "Ange Servit-kundnummer...", "Journalförd i Servit")
- `src/components/Optician/DrivingLicense/ExaminationSummary.tsx` — "Slutligt beslut fattas i Servit"
- `src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx` — "Fullständigt recept förs i Servit..."
- `src/components/Optician/EntryDetails/ModalActions.tsx` — "Markera som klar (journalförs i Servit)" (knapp + aria-label)
- `src/components/Optician/OpticianSubmittedView.tsx` — "Journalföring sker i Servit."

**Mejl till optiker (`supabase/functions/notify-optician-driving-license/index.ts`):**
- Subject: "Körkortsundersökning journalförd i ServeIT..."
- Headline: "Journalförd i ServeIT – granska och skicka intyg" / "Genomförd i Anamnesportalen – för in i ServeIT"
- Brödtext: "Patienten är journalförd direkt i ServeIT.", "...för in resultatet i ServeIT och skicka intyg..."

**Kommentarer/dokumentation (kodförklarande, syns för utvecklare):**
- `ServitJournalDialog.tsx` — header-kommentar
- `outcomeUtils.ts` — header-kommentar
- `VisualAcuityMeasurement.tsx` — `// (Servit är primär journal...)`
- `docs/TESTING_CHECKLIST.md` — "Servit-spåret: Journalför direkt i ServeIT"

## Vad lämnas oförändrat (interna identifierare)

För att undvika onödig risk och migrationsarbete behåller vi:
- Filnamn: `ServitJournalDialog.tsx`
- Komponentnamn: `ServitJournalDialog`, `ServitJournalDialogProps`
- State/variabler: `isServitDialogOpen`, `setIsServitDialogOpen`, `isServit`
- Props/payload-fält: `servitCustomerNumber`
- HTML-id:n: `servit-customer-number`, `servit-optician`, `servit-outcome`, `servit-notes`
- DB-kolumn: `servit_customer_number`
- Enum/strängvärde: `completion_method = 'servit'`

Dessa är osynliga för slutanvändaren. En framtida refaktor kan döpa om dem om så önskas — säg till så gör jag det i ett separat steg (kräver DB-migration för kolumn + enum).

## Genomförande

Cirka 7 filer redigeras med exakta sök-och-ersätt på de strängar som listats ovan. Inget bygge eller test behövs utöver TypeScript-check (sker automatiskt).
