# Fix: Rekommendation respekterar vald behörighet

## Problem
`RecommendationEngine.computeSuggestion` använder en enda hård gräns: `bothN < 0.5`. Den känner inte till vald behörighet (`group1`, `group2_3`, `renewal_higher`, `taxi`, `other`), så vid högre behörighet eller taxi blir under­kända visusvärden bara "Godkänd – rek. synundersökning" eller "Optiker ska kontakta", aldrig "Ej godkänd".

Behörigheten finns redan sparad i `examination.notes` via `LICENSE_CATEGORY_PREFIX` (sätts av `VisualAcuityMeasurement`) och kan läsas via `parseLicenseCategoryFromNotes`.

## Ändringar

### 1. `src/components/Optician/DrivingLicense/outcomeUtils.ts`
- Exportera en delad `LICENSE_CATEGORIES`-tabell (flytta från `VisualAcuityMeasurement.tsx`) med `name`, `requirementGroup` (`'lower' | 'higher' | 'taxi'`) och `requirements`. Behåll bakåtkompatibel import i `VisualAcuityMeasurement.tsx`.
- Ny helper `getRequirementGroupFromCategoryName(name?: string)` som mappar sparat `Behörighetstyp:`-namn → `'lower' | 'higher' | 'taxi'` med samma normaliserings-/regexlogik som `matchCategory` i `VisualAcuityMeasurement` (förlängning högre/tyngre, grupp II/III, C/D, lastbil/buss → `higher`; taxi → `taxi`; annars `lower`).

### 2. `src/components/Optician/DrivingLicense/RecommendationEngine.tsx`
- Läs `examination.notes` med `parseLicenseCategoryFromNotes` + `getRequirementGroupFromCategoryName` för att hämta `requirementGroup`.
- Bygg om `collectVisusFindings(examination, requirementGroup)`:
  - `lower`: behåll dagens `< 0,5 binokulärt` som hård gräns; flagga `< 1,0` per öga som "under rekommendation".
  - `higher`: hård gräns om `bestEye < 0.8` ELLER `worstEye < 0.1` (där best/worst beräknas från right/left, fall back till `both` om enskilda saknas). Lägg till tydlig finding-text, t.ex. `"Bästa ögat 0,6 — under hård gräns 0,8 för högre behörighet"`.
  - `taxi`: hård gräns om `bothN < 0.8`.
  - ±8 D-flaggan oförändrad.
- Markera findings som "hard" via en intern flagga (t.ex. tuple `{ text, hard }`) eller separat `hardLimitFindings`-array.
- `computeSuggestion(anamnesis, visus, hardLimitFindings, examination)`:
  - Om `hardLimitFindings.length > 0` → `not_approved` med rationale som listar samtliga hårda fynd.
  - Annars samma hierarki som idag (`optician_contact_first` / `approved_recommend_exam` / `approved_send`).
- Visusavvikelser-listan i UI:t markerar hårda fynd visuellt (t.ex. röd text/badge) — använd befintliga semantiska tokens, inga nya färger.
- Lägg in `<p>` som visar `Bedöms mot: <namn på behörighet>` i tekniska info-blocket så assistenten ser vilket regelverk som tillämpas.

### 3. Verifiering
- Välj "Förlängning av högre/tyngre behörighet", sätt visus båda 0,6 → utfall: **Ej godkänd**, rationale nämner "Bästa ögat 0,6 under 0,8".
- Grupp I, visus 0,6 binokulärt → "Godkänd – rek. synundersökning" (oförändrat).
- Grupp I, visus 0,4 binokulärt → "Ej godkänd" (oförändrat).
- Taxi, visus 0,7 binokulärt → "Ej godkänd".
- Grupp II/III, höger 0,9 vänster 0,05 → "Ej godkänd" (sämsta < 0,1).
- Inga anamnesfynd, godkänd visus → "Godkänd – kan skickas" (oförändrat).

## Filer
- `src/components/Optician/DrivingLicense/outcomeUtils.ts`
- `src/components/Optician/DrivingLicense/RecommendationEngine.tsx`
- `src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx` (endast import-justering om `LICENSE_CATEGORIES` flyttas)

Inga DB-migrationer, inga edge-function-ändringar.
