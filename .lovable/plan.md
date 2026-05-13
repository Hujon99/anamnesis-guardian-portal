## Problem

Den tidigare slutskärmen `ExaminationSummary` innehöll `RecommendationEngine` — sammanställningen av anamnesavvikelser, visusavvikelser och **Rekommenderat utfall**. När steg 4 byttes till `ServeitTransferView` (för att spegla ServeIT-fältordningen) togs den bort. Resultat: rekommendationen visas idag endast i optikerns post-flow vy (`DrivingLicenseResults`), inte i sista steget assistenten ser innan "Markera som skapad i ServeIT".

Genomgång av flödet (`DrivingLicenseExamination.tsx` → steg 1–4):

| Steg | Komponent | Recommendation? |
|---|---|---|
| 1 Legitimation | `IdVerification` | nej |
| 2 Formuläröversikt | `FormAnswersDisplay` | nej |
| 3 Visusmätningar | `VisualAcuityMeasurement` | nej (bara `vision_below_limit`-flagga i sidopanel) |
| 4 Skapa i ServeIT | `ServeitTransferView` | **saknas** ← buggen |

`RecommendationEngine` är ren presentation: den deriverar sin output från `examination` + `entry.answers`, som båda redan finns i steg 4. Inga datakällor saknas — det är bara komponenten som inte renderas.

## Lösning

Återinför `RecommendationEngine` i `ServeitTransferView` som en **egen tydlig sektion längst ned**, ovanför Bedömning/Optiker/Anteckning, med rubriken som önskats:

> **Rekommendation / sammanfattning till optiker**

Synlig direkt utan klick (ingen accordion). De 7 ServeIT-sektionerna behåller sin ordning oförändrade ovanför, så att copy-flödet till ServeIT inte påverkas. Bedömning/Optiker/Anteckning ligger kvar under rekommendationen — där assistenten faktiskt agerar (väljer utfall, skickar mail).

Eventuella `examination.notes` (anteckning från tidigare steg, om sådan finns) visas redan implicit via `parseOutcomeFromNotes` som förifyller "Anteckning"-fältet, så det följer också med.

### Filändring

`src/components/Optician/DrivingLicense/ServeitTransferView.tsx`
- Importera `RecommendationEngine`.
- Mellan de 7 ServeIT-sektionerna (efter `</div>` på rad 447) och `<Separator />` (rad 449), lägg in:
  ```tsx
  <section aria-labelledby="recommendation-heading" className="space-y-2">
    <h3 id="recommendation-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      Rekommendation / sammanfattning till optiker
    </h3>
    <RecommendationEngine examination={examination} entry={entry} />
  </section>
  ```

Inga ändringar i andra filer, inga schemaändringar, ingen ny logik. RecommendationEngine är redan testad och används i `DrivingLicenseResults`.

## Verifiering

1. Genomför körkortskoll i appen → fyll i steg 1–3.
2. Landa på steg 4 ("Skapa i ServeIT").
3. Kontrollera att de 7 ServeIT-sektionerna visas oförändrade högst upp.
4. Scrolla ned → rubrik **"Rekommendation / sammanfattning till optiker"** ska vara synlig direkt, följt av RecommendationEngine-kortet (anamnesavvikelser, visusavvikelser, färgkodat "Rekommenderat utfall").
5. Bedömning/Optiker/Anteckning ska finnas under rekommendationen.
6. Klicka "Markera som skapad och sparad i ServeIT" → state och mail beter sig som förut.
