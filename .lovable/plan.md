# Pedagogisk återblick på gamla körkortskollar

## Problem

När en optiker/assistent öppnar en gammal körkortskoll (inom 7-dagars retention) i entry-detail-modalen visas idag `DrivingLicenseResults` — en lång, teknisk vy full med rådata, glasstyrkor, "krumelurer" och tre olika kort (Resultat, Recommendation, OpticianDecision, CopyableExaminationSummary). Det är svårt att snabbt förstå *vad som hände* och *vad som ska göras*.

## Mål

När man öppnar en gammal körkortskoll ska man direkt se en **ren, pedagogisk sammanfattning**:

1. **Vad har vi undersökt och vad blev resultatet** — en kort summary-sektion högst upp.
2. **Vad ska/skulle göras härnäst** — tydlig instruktion baserat på `completion_method`:
   - `servit` → "Så här journalförs den här i ServeIT" + samma 7-sektioners ServeIT-guide som i sista steget i flödet (read-only).
   - `app` → "Den här är journalförd direkt i appen av optikern".
3. **Inga rådata-block, inga åtgärds-knappar för flödet** (visningsläge).

## Vad ändras

### Fil: `src/components/Optician/EntryDetails/DrivingLicenseResults.tsx` (omarbetas)

Komponenten görs om till en ren visningsvy med tre tydliga sektioner i en kolumn:

**A. Status-banner (överst)**
- Stor badge: "Journalförd i ServeIT" eller "Journalförd direkt i appen" beroende på `completion_method`.
- Datum (`updated_at`), patientnamn, bedömning från `parseOutcomeFromNotes(notes)` (Godkänd / Bokning krävs / etc.).

**B. Sammanfattning av undersökningen** — kort, läsbar lista:
- Behörighet (från notes)
- Legitimationstyp + verifierad av + datum
- Visus utan korrektion (H/V/B) — en rad
- Visus med korrektion (H/V/B) — en rad om relevant
- Korrektion (Glasögon ±8D / Kontaktlinser / Ingen)
- Anamnesfrågor — Ja/Nej-pills (samma `AnamnesisRow`-stil som i ServeitTransferView)
- Anteckning från optikern (om finns)

**C. Pedagogisk "vad gjordes/ska göras"-sektion**
- Om `completion_method === 'servit'`: rendera samma read-only ServeIT-guide som finns i `ServeitTransferView` — banner "Den här körkortskollen ska journalföras i ServeIT", de 7 numrerade sektionerna med "Så här gör du i ServeIT"-hint, ServeIT-skärmbilderna och de gröna checkrutorna. Inga Optiker-select, ingen Markera-knapp, ingen Anteckning-textarea.
- Om `completion_method === 'app'`: enkel grön bekräftelse-Alert: "Journalförd direkt i appen av {optikernamn} den {datum}." + AI-sammanfattning (om finns) i ett muted block.

**D. Bort tas / döljs i den nya vyn**
- `RecommendationEngine`-kortet (recommendation visas inbakad i summary istället).
- `DrivingLicenseOpticianDecision` (beslut redan fattat — visa bara resultatet som badge i toppen).
- `CopyableExaminationSummary` (ersätts av den nya sammanfattningen).
- Glasstyrkor-grid (Sfär/Cyl/Axel/Add) — flyttas till en collapsible "Visa tekniska detaljer" längst ned, default stängd, så den fortfarande är åtkomlig vid behov men inte stör.
- AI-sammanfattnings-genereringsknappen tas bort i visningsläget. AI-summary visas om den finns; saknas den, visas inget block alls.

### Teknisk uppdelning (refaktor)

För att kunna återanvända ServeIT-guiden i båda vyerna utan duplicering bryts den ut:

- Ny fil: `src/components/Optician/DrivingLicense/ServeitInstructions.tsx`
  - Innehåller: instruktionsbanner, de 7 sektionerna, `StepHint`, `ServeitCheckbox`, `AnamnesisRow`, skärmbilderna.
  - Props: `{ examination, entry, mode: 'guide' | 'review' }`
    - `'guide'` = aktivt steg 4 (banner säger "Så här skapar du..."),
    - `'review'` = återblick (banner säger "Den här körkortskollen journalfördes i ServeIT — så här gjordes det").
- `ServeitTransferView.tsx` förenklas: importerar `ServeitInstructions` med `mode='guide'`, behåller bara Bedömning/Optiker-select/Anteckningar/CTA.
- Nya `DrivingLicenseResults` använder `ServeitInstructions` med `mode='review'` när `completion_method === 'servit'`.

### Filer

- **Skapa**: `src/components/Optician/DrivingLicense/ServeitInstructions.tsx` (utbruten från `ServeitTransferView`).
- **Redigera**: `src/components/Optician/DrivingLicense/ServeitTransferView.tsx` (använd nya komponenten — ingen funktionell ändring).
- **Skriv om**: `src/components/Optician/EntryDetails/DrivingLicenseResults.tsx` (ny pedagogisk vy).
- **Oförändrat**: `ModalTabContent.tsx` (samma prop-signatur).
- **Inga databasändringar**, ingen ny logik, ingen ändring i flödet.

## Tekniska detaljer

- 7-dagars retention är redan implementerad via `auto_deletion_timestamp` + RLS-policy "Organization members can view recent or non-sent entries" (status `<> sent` ELLER `created_at > now() - 2h`). Ingen ändring där.
- `completion_method` finns redan som kolumn på `driving_license_examinations` (`'app' | 'servit'`).
- Outcome parsas via befintlig `parseOutcomeFromNotes` från `outcomeUtils.ts`.
- Optikernamn via `useOpticians` + `getOpticianDisplayName` (redan importerat).
- Glasstyrkor-detaljer wrappas i shadcn `Collapsible` så de finns kvar för optikerns referens.

## Verifiering

- Bygget passerar (TS strict).
- Öppna en `servit`-journalförd entry → ren summary + ServeIT-guide visas, inga åtgärdsknappar.
- Öppna en `app`-journalförd entry → ren summary + "journalförd i appen"-bekräftelse.
- Aktivt steg 4 i flödet ser fortfarande likadant ut och fungerar som tidigare.
