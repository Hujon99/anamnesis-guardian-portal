
# Plan: Anpassa Anamnesportalen till nytt önskemål-flöde

Målet: justera **endast** texter, etiketter, ordning och en liten mängd UI så att portalen tydligt kommunicerar sin nya roll (stöd + arbetsflöde, **inte** journalsystem). Befintlig kodlogik, datamodell, RLS, edge functions och datalagring lämnas i princip orörd.

---

## Jämförelse: idag vs. önskemål

| Område | Idag i koden | Önskemål | Åtgärd |
|---|---|---|---|
| 1. SMS + anamnes | Fungerar redan via `issue-form-token` + patient-länk | Oförändrat | **Ingen ändring** |
| 2. Journalföring | Portalen använder ord som "journalförd"/"journaled" som status (t.ex. `ModalActions.tsx`, statusen `journaled`) | Servit = enda journal. Portalen ska inte säga "journalförd" | **Endast textändring**: byt etikett "Markera som journalförd" → "Markera som klar (journalförs i Servit)". Behåll DB-status `journaled` orörd. |
| 3. Portalens roll | Visusmätning + glasögonstyrkor (Sph/Cyl/Axel) är obligatoriska för "högre behörigheter" | Exakta styrkor ej krävda. För glasögon: bara kontrollera om ±8 D. För linser: styrka irrelevant. Allt ska vara stöd, inte krav. | **Mindre UI-ändring**: gör fält valfria + lägg till tydlig "Hoppa över / Stöd-läge"-knapp i `VisualAcuityMeasurement.tsx`. Behåll validerings-/varningslogik som rådgivande. |
| 4. Beslut + tilldelning | `ExaminationSummary.tsx` har optiker-tilldelning + `RecommendationEngine` med 3 utfall (`vision_exam`, `optician_assessment`, `approved`) | 4 explicita utfall: **Godkänd – kan skickas / Godkänd – rek. synundersökning / Optiker ska kontakta innan inskick / Ej godkänd** | **UI-tillägg**: lägg till en `Select` med 4 alternativ ovanför optiker-tilldelningen i `ExaminationSummary.tsx`. Spara som text i existerande `notes`-fältet (eller lägg till en ny kolumn `assistant_outcome` om vi vill ha det rent — frivilligt steg). Rekommendationsmotorn behålls som förslag. |
| 5. Auto-flöde till optiker | `notify-optician-driving-license` skickar mail + `assignOptician` skapar uppgift | Oförändrat | **Ingen ändring** |
| 6. Datatillgänglighet | Auto-delete körs efter **48 h** för `journaled` (se `auto-delete-entries/index.ts`) | **30 dagar** | **Konfigändring**: ändra tröskel från 48 h till 30 dagar i edge-funktionen. Texter i `GdprInformationDialog` och liknande uppdateras till "30 dagar". |

---

## Konkreta ändringar (minimalt fotavtryck)

### A. Texter / etiketter (rent kosmetiskt)
1. `src/components/Optician/EntryDetails/ModalActions.tsx`
   - "Markera som journalförd" → **"Markera som klar (journalförs i Servit)"**
   - "Återställ till 'Klar för undersökning'" → behålls
2. `src/components/Optician/OpticianSubmittedView.tsx` + ev. dashboard-headers
   - Lägg till en liten ingress: *"Anamnesportalen är ett stöd. Journalföring sker i Servit."*
3. `GdprInformationDialog.tsx` + alla "48 timmar"-strängar (`rg "48"` i UI)
   - → "30 dagar"

### B. Visus-steget blir frivilligt stödläge
Fil: `src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx`
- Lägg till en knapp **"Hoppa över visusstöd"** bredvid "Spara och fortsätt"
- Ta bort `disabled={!isFormValid}` på primärknappen (eller behåll men gör visus-fält valfria — minst ett räcker)
- Glasögonstyrke-blocket (Sph/Cyl/Axel/Add) byts mot en enkel **Yes/No**: *"Är glasögonstyrkan över ±8 dioptrier?"* (boolean). Befintliga input-fält kan döljas bakom "Visa exakta värden (frivilligt)" så ingen DB-kolumn försvinner.
- Linser: visa text *"Styrka ej relevant — endast synskärpa kontrolleras."*

### C. 4 utfall i sammanfattningen
Fil: `src/components/Optician/DrivingLicense/ExaminationSummary.tsx`
- Lägg till `<Select>` ovanför "Tilldelning av ansvarig optiker":
  - Godkänd – kan skickas
  - Godkänd – rek. synundersökning
  - Optiker ska kontakta innan inskick
  - Ej godkänd
- Värdet sparas i `notes` (prefix `Utfall: …`) ELLER, om vi vill ha det filtrerbart i listan, en ny nullable kolumn `assistant_outcome text` på `driving_license_examinations` via migration. **Rekommendation: börja med notes-prefix** för minimal påverkan.
- Tilldelning + mail till optiker fungerar precis som idag.

### D. Datalivslängd 48 h → 30 dagar
Fil: `supabase/functions/auto-delete-entries/index.ts`
- Ändra tröskeln från `48 hours` → `30 days` för `journaled`.
- Behåll cleanup av "stuck sent" (2 h) som idag.
- Uppdatera kommentarer + alla användarsynliga texter ("Raderas automatiskt om 48 timmar" → "Raderas automatiskt efter 30 dagar").

---

## Vad vi medvetet INTE rör
- Databas-schemat (förutom ev. valfri `assistant_outcome`-kolumn i steg C — kan hoppas över)
- RLS-policies
- Status-enum (`sent / pending / ready / journaled`) — bara etiketten ändras
- `RecommendationEngine` — behålls som rådgivande stöd
- Clerk/auth, edge functions för token, submit-form, generate-summary
- Patient-formulär & SMS-flöde (steg 1 i önskemålet är redan så)

---

## Risk & robusthet
- Alla ändringar är text/etikett + frivilliga fält + en konfig-konstant. Inga breaking changes mot befintlig data.
- Status-enum `journaled` finns kvar i DB → historiska poster fungerar.
- Auto-delete-ändringen är en ren tröskel-konstant och påverkar bara nya raderingar framåt.

---

## Förslag på ordning vid implementation
1. Texter (A) — 5 min, noll risk
2. Auto-delete 30 dagar (D) — 5 min, en konstant
3. Visus-stödläge (B) — gör fält valfria, lägg till skip-knapp
4. 4 utfall i sammanfattning (C) — ny Select + spara i notes

Säg till om du vill att jag kör hela paketet eller bara delar (t.ex. bara A+D först).
