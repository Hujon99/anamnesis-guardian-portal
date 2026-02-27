
Målbild: få tillbaka klickbar förhandsgranskning (både vanlig och utskrift) och stabil PDF-paginering för hela formuläret (alla frågor), utan sidoeffekter i resten av appen.

## Vad jag har verifierat hittills
- Berörda filer är isolerade till:
  - `src/components/FormBuilder/FormBuilder.tsx`
  - `src/components/FormBuilder/FormPrintPreview.tsx`
- Knappen **Förhandsgranska utskrift** triggar `setShowPrintPreview(true)` och renderar en portal.
- Nuvarande lösning blandar:
  - portal-rendering i `document.body`
  - globala print-regler i inline `<style>` i `FormPrintPreview`
- Vi har haft flera iterationer där print-CSS påverkat layout/paginering (2 sidor, överlapp), och nu finns även symptom att förhandsgranskning inte går att öppna/klicka som tänkt.

## Do I know what the issue is?
Ja, tillräckligt för en riktad plan:
1) Vi har en regressionsrisk i portal-steget (`ReactDOM.createPortal`) som kan ge klick-/renderproblem i vissa körningar.
2) Vi har för aggressiva globala print-regler som tidigare gav överlapp/trunkering och som behöver neutraliseras till “normal flow”-print.

## Rotorsakshypotes (tekniskt)
1. **Interaktionsbugg**: portal-renderingen i `FormBuilder.tsx` är den enda nyliga förändringen som påverkar öppning av print-preview; därför måste den säkras med robust import/fallback.
2. **Paginering/överlapp**: printregler som flyttar element ur normalt flöde eller gömmer DOM brett (`visibility/display` på stora selektorer) leder till att browserns paginerare räknar fel.

## Exakt implementationsplan (minimalt scope)
Endast dessa två filer ändras.

### 1) `src/components/FormBuilder/FormBuilder.tsx` — gör öppning av print-preview robust igen
- Byt portal-anropet till säkrare mönster:
  - använd named import: `import { createPortal } from 'react-dom'`
  - använd guard: `typeof document !== 'undefined' && document.body`
- Lägg in fallback så att om portal av någon anledning inte kan användas, renderas previewn inline i samma komponentträd (samma JSX-innehåll, bara annan mountpunkt).
- Behåll samma state (`showPrintPreview`) och samma close-callback.
- Ingen annan logik ändras.

Syfte: säkerställa att knappen alltid öppnar previewn istället för att fastna på rendernivå.

### 2) `src/components/FormBuilder/FormPrintPreview.tsx` — renodla print till stabil “document flow”
- Rensa bort alla print-regler som påverkar hela appens DOM-struktur.
- Behåll endast regler som behövs för själva utskriftsinnehållet:
  - `@page` (A4 + marginal)
  - `.no-print { display: none !important; }`
  - `.print-question { break-inside: avoid; page-break-inside: avoid; }`
  - `.print-section { break-before: auto; page-break-before: auto; }`
  - `.print-content`, `.print-preview-container`, `.print-overlay-container` till `overflow: visible` och `position: static` i print
  - `html, body` endast med `height:auto; overflow:visible; margin/padding:0;`
- Undvik selektorer som döljer “allt utom X” globalt om de inte är absolut nödvändiga.
- Behåll övrig komponentlogik orörd (sektionfilter, conditional instructions, print-knapp, settings-dialog).

Syfte: browsern får paginera naturligt sida-för-sida utan överlapp eller trunkering.

## Säkerhetsräcke: vad som INTE får ändras
- Inga hooks eller API-anrop.
- Inga databasanrop.
- Inga andra sidor/komponenter än ovan två filer.
- Ingen förändring i formulärdata, validering eller sparfunktion.

## Testplan (obligatorisk efter implementation)
Jag kommer köra detta i denna ordning:

1. **Interaktions-test i editorn**
   - Klicka `Visa/Dölj förhandsgranskning` flera gånger.
   - Klicka `Förhandsgranska utskrift`.
   - Verifiera att preview öppnas/stängs konsekvent utan att sidan “låser sig”.

2. **Utskriftstest med långt formulär**
   - Öppna ett formulär med många frågor (typ Q70+).
   - Klicka `Skriv ut / Spara som PDF`.
   - Verifiera:
     - fler än 2 sidor
     - ingen text ovanpå annan text
     - frågor fortsätter i korrekt ordning till slutet.

3. **Regressionskontroll (snabb men strikt)**
   - Stäng print-preview.
   - Kontrollera att vanliga admin/edit-funktioner fungerar som innan:
     - sektioner
     - previewpanel
     - spara/stäng-knappar
   - Ingen visuell påverkan utanför printflödet.

## Om fel kvarstår efter detta (fallback-plan)
Om paginering fortfarande bryts i specifik browser:
- sista, isolerade steg blir att flytta själva utskriftsrenderingen till ett separat print-dokumentfönster (endast för printflödet), vilket helt separerar från app-layouten.
- även detta hålls till samma två filer och påverkar inget annat i appen.
