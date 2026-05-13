# Fix: Anamnesavvikelser detekteras och visas alltid

## Problem
1. `collectAnamnesisFindings` (`RecommendationEngine.tsx`) iterar bara över **nycklarna** i `entry.answers`. Diabetes och liknande sjukdomar lagras som **värden** i listor (`andra_sjukdomar_lista: ["Diabetes typ II", "Hypertoni …"]`) eller fritext (`har_sjukdomar_mediciner: "Diabetes"`). Inget keyMatch-regex träffar → fyndet syns inte.
2. När visus bryter hård gräns returnerar `computeSuggestion` `not_approved` med rationale baserad **endast på hardVisus**. Anamnesfynden tappas i rekommendationsblocket även om de fortfarande listas i "Anamnesavvikelser"-sektionen ovanför — sammanfattningen i utfallsblocket säger då inget om diabetesen.
3. Befintlig medicin-regex (`/medicin.*(syn|ögon)|påverkar.*syn/i`) träffar inte heller `mediciner: "Ja"` (generell medicinering är dock relevant för körkort, t.ex. sederande).

## Ändringar

Endast `src/components/Optician/DrivingLicense/RecommendationEngine.tsx`.

### 1. Bredda `collectAnamnesisFindings` till att scanna både nycklar och värden

- Behåll dagens `ANAMNESIS_FLAG_KEYS` för Ja/Nej-frågor.
- Lägg till en ny tabell `ANAMNESIS_VALUE_FLAGS` med regex som matchas mot **alla strängvärden** (inkl. element i arrayer):
  - `/diabet/i` → "Diabetes"
  - `/epilep/i` → "Epilepsi"
  - `/stroke|tia/i` → "Stroke/TIA"
  - `/hjärt|hjart|kärl|karl|hypertoni|blodtryck/i` → "Hjärt-/kärlsjukdom"
  - `/demens|alzheimer|kognitiv/i` → "Demens / kognitiv svikt"
  - `/parkinson|ms\b|skleros|neurologisk/i` → "Neurologisk sjukdom"
  - `/sömnapn|somnapn|narkolep/i` → "Sömnstörning (apné/narkolepsi)"
  - `/psykos|bipolär|bipolar|schizofren/i` → "Allvarlig psykisk sjukdom"
  - `/alkohol|drog|missbruk|beroende/i` → "Missbruk/beroende"
- Ny helper `walkValues(value, cb)` som rekursivt går igenom strängar/arrayer/objekt och kallar `cb(strValue)` på varje strängvärde.
- I `collectAnamnesisFindings`: efter befintlig key-loop, kör `walkValues` över hela `answers` och lägg till value-fynd i samma `findings`-array (`seen`-dedup).
- Lägg också till key-regex `/^andra_sjukdomar$|^sjukdomar_mediciner$|^har_sjukdomar_mediciner$|^mediciner$/i` med label `"Andra sjukdomar / medicinering"` så att rena Ja-svar utan lista också flaggas.

### 2. Inkludera anamnesfynd i `not_approved`-rationale

I `computeSuggestion`, när `hardVisus.length > 0`:
- Om `anamnesis.length > 0`, bygg rationale som `Skäl: ${[...hardVisus, ...anamnesis].join(' · ')}` istället för bara `hardVisus`.
- Behåll `not_approved` som beslut (visus-hårdgräns är trumf).

### 3. Tydligare rubriker i UI:t

I `RecommendationEngine` JSX:
- Sektionsrubrik "Anamnesavvikelser" får en `Badge` med antal (t.ex. `<Badge variant="secondary">{anamnesisFindings.length}</Badge>`) — speglar dagens visus-mönster.
- Visus-sektionen får motsvarande badge.
- I rekommendationsblocket: visa rationale som en `<ul>` med ett `<li>` per fynd (split på ` · `) istället för en lång konkatenerad mening, så det syns tydligt att flera avvikelser finns samtidigt.

## Verifiering

- Entry med `andra_sjukdomar_lista: ["Diabetes typ II"]` + visus 1,0 → "Anamnesavvikelser" listar **Diabetes**, utfall = `optician_contact_first`, rationale-listan visar `Diabetes`.
- Entry med diabetes + visus 0,3 binokulärt (grupp I) → utfall = `not_approved`, rationale-listan visar både `Binokulär syn 0,3 …` och `Diabetes`.
- Entry med `mediciner: "Ja"` utan diabetesnyckel → minst en anamnesavvikelse syns ("Andra sjukdomar / medicinering").
- Entry utan några avvikelser → "Inga anamnesavvikelser identifierade" (oförändrat).

## Filer
- `src/components/Optician/DrivingLicense/RecommendationEngine.tsx`

Inga DB-ändringar, inga edge-function-ändringar.
