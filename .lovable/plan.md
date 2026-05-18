# Pedagogisk ServeIT-guide i sista steget

## Mål

Sista steget i körkortsflödet (`ServeitTransferView`) ska fungera som en **steg-för-steg-guide** för en assistent som gör det här för första gången. Idag listar vyn bara värden — den ska istället tydligt instruera *"så här gör du i ServeIT"* för varje sektion, med kopierbara värden bredvid.

## Vad som ändras (endast UI/copy i ServeitTransferView)

### 1. Tydligare topp-instruktion
Banner överst utökas med en kort onboarding-text:
- "Öppna ServeIT och starta en ny körkortskoll med kundens personnummer."
- "Följ stegen 1–7 nedan i ordning. För varje fält står det vad du ska klicka i eller skriva in i ServeIT."
- Behåll: mail-statusen, "assistenten journalför inte".

### 2. Varje av de 7 sektionerna får en instruktionsrad
Ovanför värdena i varje sektion läggs en kort "Så här gör du i ServeIT:"-mening i muted text. Exempel:

- **1. Intyget avser** — "I ServeIT: bocka i behörigheten nedan i listan 'Intyget avser'."
- **2. Intyget är baserat på** — "Välj 'Undersökning' och fyll i dagens datum."
- **3. Identiteten styrkt genom** — "Välj legitimationstyp i listan 'Identiteten styrkt genom'."
- **4. Synskärpa utan korrektion** — "Skriv in synskärpan i fälten Höger / Vänster / Binokulärt."
- **5. Synskärpa med korrektion** — "Skriv in värdena i motsvarande fält. Lämna tomt om patienten inte använder korrektion."
- **6. Korrektion** — "Bocka i rätt ruta enligt nedan." + visa hänvisning till bild (se 4).
- **7. Anamnesfrågor** — "Klicka Ja eller Nej för varje fråga enligt patientens svar nedan. Om Ja: skriv in kommentaren i textfältet i ServeIT."

Texten ska vara kort, en mening, i `text-xs text-muted-foreground italic` så den inte stör värdesammanställningen.

### 3. Sektion 6 (Korrektion) — visa ServeIT-skärmbild + tydligt val
Här gör användaren mest fel. Sektionen utökas:
- Liten skärmbild från ServeIT (uppladdad `image-248.png`) sparas i `src/assets/serveit-correction-example.png` och visas inbäddad (max-w ~480px, rounded, border).
- Under bilden: en "checklista" som speglar ServeIT-rutorna och visar vilken/vilka som ska bockas i baserat på patientdata:
  - ☐ "Glasögon och inget av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen" — markeras visuellt som "bocka i" om `uses_glasses && !prescription_over_8d`
  - ☐ "Glasögon och något av glasen har en styrka över plus 8 dioptrier i den mest brytande meridianen" — om `uses_glasses && prescription_over_8d`
  - ☐ "Kontaktlinser" — om `uses_contact_lenses`
- Aktiva rutor får grön check-ikon + `bg-accent/10`; inaktiva visas grå med tom ruta. Det ger en visuell "klicka exakt dessa rutor"-instruktion.

### 4. Sektion 7 (Anamnesfrågor) — visa ServeIT-skärmbild + Ja/Nej-pill
- Liten skärmbild (uppladdad `image-249.png`) sparas i `src/assets/serveit-anamnesis-example.png` och visas inbäddad.
- Varje fråga visas som en rad med:
  - frågetexten,
  - en pill/badge som tydligt säger **JA** (grön) eller **NEJ** (grå) — så assistenten ser direkt vilken knapp i ServeIT som ska klickas,
  - om Ja + kommentar: kommentaren visas under med "Skriv detta i ServeIT:s textfält" + Copy-knapp.

### 5. Allt övrigt lämnas orört
- Rekommendation-sektionen (`RecommendationEngine`), Bedömning, Optiker-val, Anteckningar, mail-flödet, "Markera som skapad"-CTA — oförändrat.
- Inga ändringar i andra filer, ingen ny logik, inga datamodell-ändringar.

## Filer

- **Redigera**: `src/components/Optician/DrivingLicense/ServeitTransferView.tsx` (utöka UI + copy, ingen ny businesslogik).
- **Lägg till**: `src/assets/serveit-correction-example.png` (kopia av `user-uploads://image-248.png`).
- **Lägg till**: `src/assets/serveit-anamnesis-example.png` (kopia av `user-uploads://image-249.png`).

## Tekniska detaljer

- Bilderna importeras som ES6-asset: `import correctionImg from "@/assets/serveit-correction-example.png"`.
- Checklistan i sektion 6 byggs av samma `examination.uses_glasses / uses_contact_lenses / prescription_over_8d`-flaggor som redan används i `buildCorrectionLabel`. Befintliga värdesvariabeln visas kvar ovanför som "sammanfattning".
- Ja/Nej-pill i sektion 7 använder `Badge`-komponenten med `variant`-mappning: Ja → grön (`bg-emerald-500/15 text-emerald-700`), Nej → neutral.
- Alla nya färger via semantiska tokens / accept-mönster i index.css — inga rå hex.
- Mobilen: bilderna `w-full max-w-md`, checklistan stackas naturligt.

## Verifiering

- Bygget passerar (TS strict).
- Manuellt flödestest: kör hela körkortsflödet → steg 4 visar guide + bilder + korrekt ifyllda checkrutor + Ja/Nej-pills.
- Inga regressioner i mail/spara-flödet (oförändrad kod).
