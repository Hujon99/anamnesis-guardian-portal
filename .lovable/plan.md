## Mål

Ersätt slutsteget i körkortsundersökningen (`ExaminationSummary`) med en ny **"ServeIT Data Support"-vy** som hjälper assistenten att manuellt mata in resultaten i ServeIT — utan att assistenten själv journalför.

## Återanvändning (inga parallella system)

- **Komponent**: bygg en ny `ServeitTransferView.tsx` i `src/components/Optician/DrivingLicense/` och anropa den från `DrivingLicenseExamination.tsx` i steg 4 istället för `ExaminationSummary`. `ExaminationSummary.tsx` lämnas kvar tills ingen referens finns kvar, sedan tas filen bort i samma PR.
- **Återanvänds**: `useOpticians`, `useEntryMutations.assignOptician`, `useSupabaseClient`, `useSafeOrganization`, `useSafeUser`, `outcomeUtils` (`OUTCOME_OPTIONS`, `combineNotesWithOutcome`, `getOutcomeLabel`, `parseOutcomeFromNotes`), `formatVisualAcuityDisplay`, edge-funktion `notify-optician-driving-license`, befintlig toast (`@/hooks/use-toast`), Shadcn (`Card`, `Button`, `Input`, `Textarea`, `Label`, `Select`, `Alert`), Lucide-ikoner.
- **Genvägen** från listan (`AnamnesisListItem` → `ServitJournalDialog`) lämnas orörd i denna iteration.

## Vy-struktur (en kolumn, allt synligt — inga tabs/accordion/modaler)

Kompakt layout (`max-w-3xl mx-auto`, `space-y-4`, `text-sm`), optimerad för delad skärm.

1. **Banner** överst (`Alert` med `bg-primary/10 border-primary/30`, ikon `Mail`):
   - "Mail har skickats till optikern." (visas först efter att assistenten klickat Markera som skapad — innan dess: "Mail skickas till optikern när du markerar nedan.")
   - "Nästa steg: Assistenten ska skapa en körkortskoll i ServeIT och spara den."
   - "Assistenten ska inte journalföra — det gör optikern." (fet)

2. **7 read-only sektioner** (komponent `ServeitField` återanvänds; varje fält har label, värde/`—`, copy-knapp `Copy`-ikon med `navigator.clipboard.writeText` + toast "Kopierat!"):
   1. *Intyget avser* — härleds från `parseLicenseCategoryFromNotes` (annars `—`)
   2. *Intyget är baserat på* — "Undersökning, {dagens datum sv-SE}"
   3. *Identiteten styrkt genom* — `entry.id_type` mappad till svensk text (Körkort/Pass/ID-kort/Annat), annars `—`
   4. *Synskärpa utan korrektion* — Höger / Vänster / Binokulärt från `examination.visual_acuity_right_eye / _left_eye / _both_eyes` via `formatVisualAcuityDisplay`
   5. *Synskärpa med korrektion* — `visual_acuity_with_correction_right / _left / _both`
   6. *Korrektion* — sammansatt sträng från `correction_type` + `uses_glasses`/`uses_contact_lenses` + `prescription_over_8d` ("Glasögon", "Kontaktlinser", "Styrka ±8 dioptrier")
   7. *Anamnesfrågor* — två rader (Ja/Nej + kommentar) som extraheras ur `entry.answers` via befintliga nyckelmönster (eye_disease/vision_loss + other_medical). Saknas värde → `—`.

   Tomma fält visas som `—` och kopierar tom sträng (per beslut).

3. **Bedömning + Optiker + Anteckning** (behålls exakt enligt dagens `ServitJournalDialog`-form, oförändrad funktionalitet/sparlogik):
   - `Select` för utfall (`OUTCOME_OPTIONS`, obligatoriskt)
   - `Select` för ansvarig optiker (mejlmottagare, obligatoriskt)
   - Valfri `Textarea` för anteckning

4. **Primary CTA** längst ner: **"Markera som skapad och sparad i ServeIT"**
   - Validerar utfall + optiker.
   - Uppdaterar/insertar i `driving_license_examinations`: `examination_status='completed'`, `completion_method='servit'`, `notes = combineNotesWithOutcome(outcome, notes)`. Inget nytt statusvärde behövs (`awaiting_serveit` finns inte i schemat och hade krävt migration som inte ingår i denna iteration — `completion_method='servit'` + status används som filter).
   - Anropar `assignOptician` och edge-funktionen `notify-optician-driving-license` med `completionMethod:'servit'` (utan `servitCustomerNumber` eftersom det inte längre samlas in — fältet är optional i edge-funktionen).
   - Visar success-toast + uppdaterad banner-text + kallar `onComplete()` (stänger modalen i `DrivingLicenseExamination`).

## Ändringar i `DrivingLicenseExamination.tsx`

- Importera och rendera `ServeitTransferView` istället för `ExaminationSummary` i steg 4.
- Stegtitel "Slutföra" → **"Skapa i ServeIT"** (`CheckCircle`-ikon kvar).

## Recent Tests View — dashboardfilter

I dashboardens befintliga lista (`AnamnesisListItem`-grid; troligen filterkomponent intill `Dashboard.tsx` — identifieras vid implementation) läggs ett nytt chip/filter **"ServeIT pågående/klara"** som filtrerar `driving_license_status.examination.completion_method === 'servit'`. Återanvänder samma listitem och datakälla, ingen parallell vy.

## Vad detta INTE gör

- Ingen ny route/sida (vyn renderas inom befintlig `DrivingLicenseExamination`-modal).
- Ingen schemaändring (inget nytt status-enum).
- Ingen ändring av `ServitJournalDialog` (genvägen från listan).
- Ingen ändring av edge-funktionen.
- `ExaminationSummary.tsx` tas bort när inga referenser kvarstår.

## Verifiering

- TypeScript + lint utan nya fel.
- Manuell QA: starta körkortsundersökning, gå igenom Legitimation → Anamnes → Visus → ServeIT-vyn. Kontrollera att alla 7 sektionerna visas i exakt ordning med korrekta labels, att tomma värden ger `—`, att copy-knappen kopierar och visar "Kopierat!"-toast, att Markera-knappen sparar `completion_method='servit'` + `examination_status='completed'`, mejl skickas, banner uppdateras.
- Verifiera att dashboardens nya filter visar samma post.

## Filer som ändras / skapas

- `src/components/Optician/DrivingLicense/ServeitTransferView.tsx` *(ny)*
- `src/components/Optician/DrivingLicense/DrivingLicenseExamination.tsx` *(byter komponent i steg 4 + stegtitel)*
- `src/components/Optician/DrivingLicense/ExaminationSummary.tsx` *(tas bort)*
- Dashboardfilter-fil för anamneslistan *(läggs till med nytt chip; exakt fil identifieras vid implementation, inget nytt parallellt system)*