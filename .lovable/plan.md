
Mål: Fixa utskrift/PDF så att hela formuläret (alla frågor, t.ex. upp till Q71) pagineras korrekt sida-för-sida utan överlapp, och utan att ändra något annat i appen.

## Vad som sannolikt är fel nu
Jag har gått igenom aktuell kod i `FormPrintPreview.tsx` och `FormBuilder.tsx` samt din senaste diff. Det som nu orsakar beteendet (2 sidor + text ovanpå varandra) är kombinationen:

1. `body * { visibility: hidden; }`
2. `.print-overlay-container { position: absolute !important; ... }`

Det gör att:
- övriga (dolda) element fortfarande påverkar sidlayouten i print-flödet,
- själva printinnehållet ligger absolutpositionerat ovanpå,
- resultatet blir felaktig pagination + överlapp (exakt som på din screenshot).

## Lösningsstrategi (minimalt och isolerat)
Vi backar från “visibility + absolute”-strategin och går över till en stabil print-flow-strategi:

1. Låt `.print-overlay-container` delta i normalt dokumentflöde under print (inte absolute/fixed).
2. Tvinga bort viewport-låsningar (`fixed`, `h-screen`, `overflow-auto`) i print för just print-vyn.
3. Behåll sidbrytning på frågenivå (`.print-question { page-break-inside: avoid; }`), men tillåt sektioner att fortsätta över flera sidor.
4. Dölj enbart UI-kontroller (`.no-print`) istället för att gömma hela DOM-trädet med `visibility`.

## Exakta ändringar (endast dessa filer)
### 1) `src/components/FormBuilder/FormPrintPreview.tsx` (huvudfix)
I `@media print`-blocket:

- Ta bort:
  - `body * { visibility: hidden; }`
  - `.print-overlay-container, .print-overlay-container * { visibility: visible; }`
  - `.print-overlay-container { position: absolute; left/top/width... }`

- Ersätt med print-flow-regler:
  - `.print-overlay-container { position: static !important; inset: auto !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }`
  - `.print-preview-container { max-width: none !important; margin: 0 !important; padding: 0 !important; background: white !important; }`
  - `.print-content { overflow: visible !important; }`
  - `body, #root { margin: 0 !important; padding: 0 !important; }`
  - behåll `.no-print { display: none !important; }`
  - behåll `.print-question { page-break-inside: avoid; }`
  - behåll `.print-section { page-break-before: auto; }`

Detta gör att printmotorn kan paginera naturligt över många sidor.

### 2) `src/components/FormBuilder/FormBuilder.tsx` (ingen ny funktionalitet)
Ingen logikändring planeras. Klassnamnet `print-overlay-container` finns redan på print-modalen och återanvänds av CSS. Om inget annat behövs lämnas filen orörd.

## Varför detta är säkert i en stor app
- Endast print-media-CSS för print preview berörs.
- Inga hooks, state, API-anrop, datamodeller eller formulärlogik ändras.
- Ingen påverkan på vanliga skärm-vyer (admin, dashboard, patientflöden).
- Ingen påverkan på andra utskriftsflöden (exempelvis CISS-sidan) eftersom reglerna är scoped till aktuell print-container.

## Verifieringsplan (måste göras efter fix)
1. Öppna ett långt standardformulär i Form Builder.
2. Klicka “Skriv ut / Spara som PDF”.
3. Kontrollera i print preview:
   - att sidantalet är fler än 2 (för lång form),
   - att text inte överlappar,
   - att frågor fortsätter korrekt sida för sida till slutet.
4. Spara som PDF och verifiera att PDF matchar preview (ingen trunkering vid Q4/Q10).
5. Snabb regressionskontroll:
   - stäng print preview,
   - kontrollera att vanlig adminvy/layout ser exakt ut som innan.

## Risker och fallback
- Om någon webbläsare fortfarande klipper sidor p.g.a. egna print-buggar, fallback är att i samma fil lägga till:
  - `html, body { height: auto !important; overflow: visible !important; }`
  (fortfarande print-only och scoped till denna funktion).
- Ingen rollback utanför denna komponent behövs.

## Implementationsgräns (viktigt)
Jag håller ändringen strikt till printfunktionens CSS i `FormPrintPreview.tsx` (och lämnar övriga appen orörd), precis enligt ditt krav.
