## Bakgrund — Christians feedback

Det nya arbetsflödet säger att assistenten ska välja ett utfall **innan** ärendet tilldelas optiker:

1. Godkänd – kan skickas
2. Godkänd – rek. synundersökning
3. Optiker ska kontakta innan inskick
4. Ej godkänd

Status idag:

- **"Genomför i appen"** (`ExaminationSummary.tsx`) — ✅ redan implementerat. Utfallet sparas som textprefix i `notes` (`Utfall: <label>`).
- **"Journalför i Servit"** (`ServitJournalDialog.tsx`) — ❌ saknar bedömningssteget helt. Christian använder främst detta flöde, så det är där han märker att det fattas.
- **Mejlet till optiker** (`notify-optician-driving-license`) — visar inte utfallet idag, vilket gör att optikern måste öppna appen för att se assistentens bedömning.

## Mål

Lägga in samma fyra-utfalls-väljare i Servit-dialogen som i app-flödet, samt skicka med utfallet i mejlet så att optikern direkt ser assistentens bedömning.

## Plan

### 1. Dela utfalls-konstanten

Bryt ut `OUTCOME_OPTIONS`, `OutcomeValue`, `OUTCOME_PREFIX` och `parseOutcomeFromNotes` från `ExaminationSummary.tsx` till en ny gemensam fil:

```
src/components/Optician/DrivingLicense/outcomeUtils.ts
```

Importeras från både `ExaminationSummary.tsx` och `ServitJournalDialog.tsx`. Ingen funktionell ändring för app-flödet — bara flytt + import.

### 2. Lägg in utfallssteget i `ServitJournalDialog.tsx`

Mellan "Kundnummer i Servit" och "Ansvarig optiker", lägg till ett `Select`-fält "Bedömning" med samma fyra alternativ. Designen följer Blue Pulse (matchande label-stil med ikon, accent-färg).

- `outcome` blir **obligatoriskt** (samma princip som kundnummer + optiker). Validering med toast vid saknat val.
- När `handleConfirm` skapar/uppdaterar `driving_license_examinations`-raden kombineras valt utfall med ev. fritextanteckning på samma format som app-flödet:
  ```
  Utfall: <label>
  
  <fri text>
  ```
  Sparas i `notes`-kolumnen (ingen DB-migration behövs).

### 3. Skicka med utfallet i mejlet

- I båda anropen till `supabase.functions.invoke("notify-optician-driving-license", ...)` (Servit + app) lägg till `outcomeLabel` i body.
- I edge-funktionen `notify-optician-driving-license/index.ts`:
  - Ta emot `outcomeLabel?: string` i request-payloaden.
  - Rendera ett tydligt utfalls-block i HTML-mejlet ovanför "Patientinformation", med färgkodning beroende på utfall (grön = godkänd, gul = rek. synundersökning, orange = kontakta innan inskick, röd = ej godkänd).
  - Lägg in utfallet i subject-raden för Servit-mejl, t.ex.
    `Körkortsundersökning journalförd i Servit – kundnr 12345 – Godkänd kan skickas`.

### 4. QA / kontroll

- Verifiera i preview att Servit-dialogen nu kräver utfall + visar valideringstoast.
- Skicka ett test-mejl (Christian/Hugo som mottagare) i båda flödena och bekräfta:
  - utfallet syns tydligt i mejlet,
  - subjectet uppdateras,
  - befintliga app-flödesmejl fortfarande fungerar (inget regression).

## Tekniska detaljer

**Filer som ändras:**

| Fil | Ändring |
|---|---|
| `src/components/Optician/DrivingLicense/outcomeUtils.ts` | Ny — innehåller `OUTCOME_OPTIONS`, `OutcomeValue`, `OUTCOME_PREFIX`, `parseOutcomeFromNotes`, `combineNotesWithOutcome` |
| `src/components/Optician/DrivingLicense/ExaminationSummary.tsx` | Ta bort lokala konstanter, importera från `outcomeUtils`, skicka `outcomeLabel` till edge-funktionen |
| `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` | Lägg till outcome-state + `Select`-block, validera, kombinera notes via helper, skicka `outcomeLabel` till edge-funktionen |
| `supabase/functions/notify-optician-driving-license/index.ts` | Acceptera `outcomeLabel` i payload, rendera utfalls-block + lägg till i subject |

**Inga DB-migrationer behövs** — utfallet sparas fortsatt som prefix i `notes` (samma format som app-flödet) och `outcomeLabel` i mejlet är derived data.

**Z-index:** Servit-dialogen ligger i en Dialog (`z-[1000]`), så `SelectContent` för utfallet får samma `z-[1100]` som befintlig optiker-Select i samma fil.

**Backwards-compatibility:** Edge-funktionen behandlar `outcomeLabel` som optional — gamla anrop utan fältet fungerar oförändrat.
