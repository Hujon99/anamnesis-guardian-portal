# Soft-flagga visus < 1,0 vid högre behörighet

## Vad användaren upptäckte

Testfall: **Förlängning högre behörighet** med glasögon, korrigerad visus H 0,9 / V 0,9 / binokulärt 1,0.

- Personen klarar minimikraven (bästa ≥ 0,8, sämsta ≥ 0,1) → körkortet kan godkännas.
- Men eftersom **något öga ligger under 1,0** vill vi ändå **rekommendera synundersökning**.
- Idag säger motorn "Godkänd – kan skickas" (helt grönt). Det är fel signal.

Förväntat utfall: **"Godkänd – rek. synundersökning"** (gult).

Detta ska gälla **oavsett** om personen använder glasögon/linser eller inte — så länge gruppen är `higher`.

## Ändring

Endast i `src/components/Optician/DrivingLicense/RecommendationEngine.tsx` → `collectVisusFindings` för `requirementGroup === 'higher'`:

Lägg till **mjuka** visusfynd (`hard: false`) när ett enskilt öga (höger eller vänster) ligger under 1,0 — utöver de befintliga hårda gränserna (bästa < 0,8, sämsta < 0,1).

- Hårda gränser → fortsätter ge "Ej godkänd" (rött).
- Nya mjuka fynd ensamma + ingen anamnesavvikelse → `computeSuggestion` returnerar redan "Godkänd – rek. synundersökning" (gult). Ingen ändring i `computeSuggestion` behövs.
- Mjuka fynd + anamnesavvikelse → fortsätter ge "Optiker ska kontakta" (orange). Oförändrad logik.

Texten för det mjuka fyndet blir t.ex.: `Visus höger öga 0,9 under 1,0 (rekommendera synundersökning vid högre behörighet)`.

Binokulär `< 1,0` lägger vi **inte** till som soft för `higher` — det är inte ett kliniskt krav, och en sämre binokulär utan att något öga är under 1,0 bör inte kunna hända i praktiken.

## Verifiering

| Scenario (higher) | Förväntat |
|---|---|
| H 1,0 / V 1,0 / bino 1,0, ingen anamnes | Godkänd – kan skickas (grön) |
| H 0,9 / V 0,9 / bino 1,0, ingen anamnes | Godkänd – rek. synundersökning (gul) ✅ ny |
| H 0,7 / V 1,0, ingen anamnes | Ej godkänd (röd) — bästa < 0,8 |
| H 0,9 / V 0,9, anamnesavvikelse | Optiker ska kontakta (orange) |
| Grupp I, H 0,9 / V 0,9 / bino 1,0 | Oförändrat (befintliga regler gäller) |
