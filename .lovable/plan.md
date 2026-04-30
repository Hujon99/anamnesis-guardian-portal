## Mål

Idag finns bara ett alternativ på körkortskortet: **"Genomför körkortsundersökning"** (i appen). Vi vill lägga till ett parallellt spår för optiker som hellre journalför hela undersökningen direkt i **Servit**. Resultatet ska bli ett tydligt mejl till ansvarig optiker som beskriver vad som faktiskt gjorts och vad nästa steg är (intyg till Transportstyrelsen).

## Nytt flöde – två val på körkortskortet

```text
[ Körkortskort på dashboard ]
        |
        +---> "Genomför körkortsundersökning"  (befintligt, i appen)
        |          -> visusmätning, ID-kontroll, sammanfattning, tilldela optiker
        |          -> mejl: "Genomförd i Anamnesportalen – för in i Servit"
        |
        +---> "Journalför i Servit"            (NYTT)
                   -> dialog: "Ange kundnummer i Servit"
                   -> tilldela ansvarig optiker
                   -> mejl: "Journalförd i Servit – kundnr XXXX. Granska & skicka intyg"
```

## UI-ändringar

**1. `AnamnesisListItem.tsx` (rad ~445–467)**
Ersätt den enskilda primärknappen med två knappar sida vid sida:
- Primär: "Genomför körkortsundersökning" (befintligt beteende, öppnar `DrivingLicenseExamination`-modalen)
- Sekundär (outline): "Journalför i Servit" (öppnar ny dialog)

Båda göms när `isDrivingLicenseCompleted === true`. Visad badge efter slutförande ändras till antingen "Slutförd i appen" eller "Journalförd i Servit – kundnr XXXX".

**2. Ny komponent: `ServitJournalDialog.tsx`** (i `src/components/Optician/DrivingLicense/`)
- Fält: **Kundnummer i Servit** (obligatoriskt, fritext, trim, valfri regex senare)
- Fält: **Ansvarig optiker** (samma `useOpticians`-select som i `ExaminationSummary`)
- Fält: Anteckningar (valfritt)
- Knapp: "Bekräfta journalföring" → sparar examination + skickar mejl + stänger dialog

## Datamodell

Lägg till två kolumner i `driving_license_examinations`:
- `completion_method` (text, enum-liknande: `'app' | 'servit'`, default `'app'`)
- `servit_customer_number` (text, nullable)

Migration:
```sql
ALTER TABLE public.driving_license_examinations
  ADD COLUMN IF NOT EXISTS completion_method text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS servit_customer_number text;
```

När "Journalför i Servit" bekräftas skapas/uppdateras en rad med:
- `examination_status = 'completed'`
- `completion_method = 'servit'`
- `servit_customer_number = <input>`
- `optician_id` på `anamnes_entries` sätts via befintlig `assignOptician`

## Edge function – `notify-optician-driving-license`

Funktionen tar emot ett nytt fält `completionMethod: 'app' | 'servit'` och ett valfritt `servitCustomerNumber`. Mejlinnehållet förgrenas:

**Variant A – Genomförd i Anamnesportalen** (befintligt, men förtydligat):
> Undersökningen är genomförd i Anamnesportalen.
> **Nästa steg:** För in resultatet i Servit och skicka intyg till Transportstyrelsen.

**Variant B – Journalförd i Servit** (NY):
> Patienten är journalförd i Servit under **kundnummer {servitCustomerNumber}**.
> **Nästa steg:** Gå in i Servit, granska undersökningen och skicka intyg till Transportstyrelsen.

Båda mejlen behåller patientnamn, butik, organisation och länk till dashboard.

## Sammanfattning av ändringar

| Fil | Ändring |
|---|---|
| `supabase/migrations/<ny>.sql` | Lägg till `completion_method` + `servit_customer_number` |
| `src/components/Optician/AnamnesisListItem.tsx` | Två knappar istället för en, ny badge-text |
| `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` | NY komponent |
| `src/components/Optician/AnamnesisListView.tsx` (eller motsv. parent) | Hanterar nytt callback `onJournalInServit` |
| `src/hooks/useBulkDrivingLicenseStatus.ts` | Returnera `completionMethod` + `servitCustomerNumber` så badgen kan visa rätt text |
| `supabase/functions/notify-optician-driving-license/index.ts` | Förgrenat mejlinnehåll baserat på `completionMethod` |
| `src/components/Optician/DrivingLicense/ExaminationSummary.tsx` | Skicka med `completionMethod: 'app'` vid befintligt flöde |

## Acceptanskriterier

1. På körkortskort visas **två** knappar: "Genomför körkortsundersökning" och "Journalför i Servit".
2. "Journalför i Servit" öppnar dialog som kräver kundnummer + optiker innan bekräftelse.
3. Efter bekräftelse syns badgen "Journalförd i Servit – kundnr XXXX" och kortet flyttas till "Journalförda".
4. Optikern får mejl med korrekt variant (A eller B) inkl. kundnumret när det gäller Servit-spåret.
5. Befintligt app-flöde är oförändrat förutom att mejltexten förtydligas till "för in resultatet i Servit + skicka intyg".

## Öppna frågor (kan tas senare, blockerar inte starten)

- Ska kundnumret gå att redigera efteråt om det skrevs fel? (förslag: ja, via "Återställ"-knappen som redan finns)
- Format/validering på kundnummer – fri text räcker i v1?
