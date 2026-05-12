# Plan: Körkortsflödet – feedbackrunda

Fyra konkreta justeringar baserat på Christians testning.

## 1. Behörighetsval återställs vid visusmätning

**Problem:** I `VisualAcuityMeasurement.tsx` initieras `licenseCategory` med `useState(detectedLicenseCategory)`. `detectedLicenseCategory` är en `useMemo` som läser `entry?.answers`. Vid första render är `entry` ofta inte hydrerat → defaultar till `'lower'`. När `entry` sedan kommer in uppdateras memo-värdet, men `useState` kör bara init-värdet en gång → dropdown står kvar på "Lägre behörigheter".

**Fix:**
- Lägg till `useEffect` som synkar `licenseCategory` med `detectedLicenseCategory` så länge användaren inte aktivt har ändrat den (en `userOverridden`-flagga som sätts `true` i `onValueChange`).
- Säkerställ också att en redan sparad `examination.notes` med `Behörighetstyp: …` läses tillbaka som ursprungsvärde (parse av första raden) — så att om man backar och går fram igen får man rätt val.
- Utöka detektionen så den även matchar exakta etiketterna ("Högre behörigheter", "Taxiförarlegitimation") och inte bara enstaka bokstavskombinationer.

## 2. Rekommendation vid kombinerad anamnes- + visusavvikelse

**Problem:** `RecommendationEngine` listar visusvarningar tydligt men anamnesavvikelser (ögonsjukdom, dubbelseende, mörkerseende, mediciner som påverkar syn) bakas inte in i sammanfattningen, och föreslaget utfall framgår otydligt när båda triggar.

**Fix i `RecommendationEngine.tsx` + `WarningsDisplay.tsx`:**
- Extrahera anamnesavvikelser från `entry.answers` (gula flaggor: ögonsjukdom = Ja, dubbelseende = Ja, mörkerseende-problem = Ja, mediciner som påverkar syn = Ja, övriga hälsofaktorer = Ja).
- Visa två tydliga sektioner: **"Anamnesavvikelser"** och **"Visusavvikelser"** ovanför rekommendationen.
- Beräkna föreslaget utfall från kombinerad bild:
  - Visus under hård gräns → "Ej godkänd / hänvisa till optiker".
  - Anamnesavvikelse + visus ok → "Optiker ska kontakta innan inskick".
  - Anamnesavvikelse + visus avviker → "Optiker ska kontakta innan inskick" (starkare motivering).
  - Inga avvikelser → "Godkänd – kan skickas".
- Visa det föreslagna utfallet som en stor, färgkodad rad ("Rekommenderat utfall: …") direkt ovanför OUTCOME-väljaren, så assistenten ser kopplingen.

## 3. Rensa upp optikermailet

**Fix i `supabase/functions/notify-optician-driving-license/index.ts`:**
- **Hoppa över ej besvarade följdfrågor:** I `buildAnswersBlock`, om en fråga är ett villkorligt fält (har `conditional`/`showIf` i schemat eller är "Om ja/nej, beskriv"-mönster) och svaret är tomt → utelämna raden helt.
- Generell regel: visa aldrig "(ej besvarad)" för fält som matchar regex `/^(om (ja|nej)|if (yes|no))[,:]/i` eller har `type: 'text'/'textarea'` utan svar.
- **Filtrera bort systemmetadata** ur "Övriga svar":
  - Lägg `consent_given`, `terms_version`, `privacy_policy_version`, `consent_timestamp`, `gdpr_*`, `id_verification_*`, `verified_*` i en `EXCLUDED_KEYS`-set.
  - Hela "Övriga svar"-sektionen utelämnas om den blir tom efter filtrering.
- Behåll bedömnings-, patient- och anteckningsblocken som de är.

## 4. Visa anamnesen även vid "Journalför i ServeIT"

**Problem:** När man öppnar `ServitJournalDialog` ser optikern bara dialogen — anamnessvaren från det vanliga `ExaminationSummary`-flödet är inte synliga, så portalen tappar sitt värde som underlag medan man knappar in i ServeIT.

**Fix:**
- Bredda `ServitJournalDialog` till en två-kolumns layout (på `lg:` och uppåt):
  - Vänster kolumn: befintliga input-fält (kundnummer, anteckning, optiker, utfall, CTA).
  - Höger kolumn: en scrollbar `FormAnswersDisplay` med entryns anamnessvar + ev. AI-sammanfattning (samma komponent som används i app-spåret).
- På mindre skärmar (< lg) staplas anamnesen under formulärfälten i samma dialog, fortfarande scrollbar.
- Sätt `DialogContent` till `max-w-5xl` och `max-h-[90vh] overflow-hidden` med intern scroll i högra kolumnen, så optikern enkelt kan kopiera text samtidigt som ServeIT är öppet bredvid.

## Tekniska detaljer

**Filer som berörs:**
- `src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx` — sync-effect + parse av sparad `Behörighetstyp` + bredare detektion.
- `src/components/Optician/DrivingLicense/RecommendationEngine.tsx` — anamnes-extraktion + kombinerad utfallslogik.
- `src/components/Optician/DrivingLicense/WarningsDisplay.tsx` — separata sektioner för anamnes vs visus.
- `supabase/functions/notify-optician-driving-license/index.ts` — `EXCLUDED_KEYS`, conditional-filtrering, drop tomma "Om ja"-fält.
- `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` — två-kolumns layout, importera och rendera `FormAnswersDisplay`.

**Ingen DB-migration krävs.** Inga RLS-ändringar.

**Verifiering:** Manuell genomgång av båda flödena (app + ServeIT) som assistent → optiker, samt skicka test-mail för att kontrollera att inga "(ej besvarad)"-rader eller systemfält syns i optikermailet.
