## Mål

Lyfta UX:en på det nya **"Journalför i Servit"-flödet** så det känns premium, tydligt och i linje med Blue Pulse-konceptet (sjukhusblå trygghet + teal pulse + lugn luftighet). Två ytor uppgraderas: körkortskortets knappar på dashboarden, och själva dialogen.

## 1. Körkortskortet på dashboarden – tydligare hierarki

Idag står två knappar bredvid varandra med samma vikt, vilket gör valet otydligt. Förbättringar:

- Liten infotext ovanför knapparna: "Hur vill du genomföra undersökningen?"
- **Primär knapp** (vänster, fyllnad i `primary`): "Genomför i appen" med `Car`-ikon — fortsatt huvudval
- **Sekundär knapp** (höger, outline med teal hover): "Journalför i Servit" med `ClipboardCheck`-ikon
- Båda får hover-lift (subtle `translate-y` + `shadow-md`) och `transition-all duration-200`
- På mobil staplas de och får full bredd; på desktop sitter de i ett grid med samma höjd
- Slutförd-badgen för Servit byts till en mjuk teal "pulse"-stil (`bg-accent/15`, `border-accent/30`) med kundnummer i monospace

## 2. ServitJournalDialog – "mumsig" version

### Layout
- Bredare dialog: `sm:max-w-lg` (mer luft)
- Toppen får ett **gradient-band** (primary → accent-teal) med stor ikon `ClipboardCheck` i vit cirkel
- Subtitel: kort förklaring om att kundnumret hamnar i optikerns mejl
- Patient-snippet i en liten "context card" (ljusgrå surface, rounded-xl) så användaren ser vem det gäller: namn + bokningsdatum

### Fält
- **Kundnummer** får större `Input` (`h-12`, `text-lg`, monospace, centrerat caret), med dekorativ ikon till vänster (#) och hjälptext under: "Numret som visas i Servit för denna patient"
- Live-validering: tom → muted border, ifylld → teal border (`focus-visible:ring-accent`)
- **Optiker-select** behåller funktion men får avatar-cirkel (initialer) framför namnet i listan
- **Anteckningar** kollapsbar via en liten "Lägg till anteckning"-toggle så formuläret inte ser långt ut by default

### Mikrointeraktioner
- Bekräfta-knappen blir `bg-gradient-to-r from-primary to-accent` med `shadow-elegant`-glow på hover
- Vid spara: knappen byter till `Sparar...` med spinner och en tunn progress-linje längst ner i dialogen
- Vid lyckat svar: kort `pop`-animation på en grön check innan dialogen stängs (250 ms)

### Footer
- "Avbryt" som ghost (mindre visuell vikt)
- "Bekräfta journalföring" som primär gradient
- Mobil: knapparna staplas, primär överst

## 3. Tillgänglighet & detaljer

- Säkerställ kontrast WCAG AA på all text mot bakgrunder
- `aria-required` + `aria-invalid` på obligatoriska fält
- Fokusring tydlig (teal) på alla interaktiva element
- Esc stänger dialogen (om inte `isSaving`), Enter i kundnummerfältet hoppar till optikerväljaren

## 4. Filer som påverkas

| Fil | Ändring |
|---|---|
| `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` | Hela UI-skalet + gradient-header, patientkort, större fält, gradient CTA, kollapsbar anteckning |
| `src/components/Optician/AnamnesisListItem.tsx` | Förtydligad knapp-hierarki, hover-lift, infotext, polerad Servit-badge |
| `src/index.css` (vid behov) | Lägg till `@keyframes pop` om inte redan finns; säkerställ `shadow-elegant`-token |

## 5. Acceptanskriterier

1. Knapparna på körkortskortet har en tydlig primär/sekundär-relation (inte två likadana).
2. Dialogen har gradient-header med stor ikon och visar patientens namn + bokningsdatum.
3. Kundnummer-fältet är stort, monospace och har hjälptext.
4. Bekräfta-knappen är gradient och får glow på hover.
5. Allt fungerar lika bra på 375px mobil som på 1280px desktop.
6. Inga regression i logik – samma data sparas och samma mejl skickas som idag.

## Tekniska detaljer

- Använder befintliga semantiska tokens (`primary`, `accent`, `muted`, `surface`) — inga hårdkodade färger
- Inga nya beroenden, allt med Tailwind + shadcn
- Patient-kortet får data via befintlig `entry`-prop (redan tillgänglig)
- Kollapsbar anteckning byggs med enkel `useState`-toggle, inte Radix Collapsible (för enkelhet)
