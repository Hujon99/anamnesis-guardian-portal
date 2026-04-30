## Plan: Christians feedback – mejlinnehåll, dioptrier, testflöde

Tre delar baserat på Christians punkter. Allt passar in i nuvarande flöde (App-spår + Servit-spår delar redan `outcomeUtils` och `notify-optician-driving-license`).

---

### 1. Mejl till optiker – all info direkt i inkorgen

**Mål:** Optikern fattar beslut direkt från mejlet, behöver inte logga in.

**Vad som ska finnas i mejlet (i denna ordning):**
1. **Bedömning** (utfallet) – färgkodat block (finns redan).
2. **Patient** – Förnamn (finns) + **Kundnummer** (Servit-nr om Servit-spår, annars `patient_identifier`). **Aldrig personnummer.**
3. **Bokning/butik** – datum + butik (finns).
4. **Anteckning från assistent** – om sådan finns (visas i ett gråt block).
5. **Anamnes-svar – komplett lista, ordagrant** – alla frågor med kundens svar, grupperade per sektion enligt formulärmallen. Ingen tolkning, ingen AI-summering. Tomma svar markeras "(ej besvarad)".

**Tekniskt:**
- Edge function `notify-optician-driving-license`:
  - Hämta `anamnes_entries.answers`, `formatted_raw_data`, `patient_identifier`, `form_id`.
  - Hämta `anamnes_forms.schema` för `form_id` → använd sektioner + frågor som "facit" så ordning och labels matchar formuläret.
  - Bygg en HTML-tabell per sektion: `Fråga | Svar`. Checkbox-svar (arrays) joinas med komma. Booleska svar visas som "Ja"/"Nej".
  - Escapa allt HTML (skydd mot injection från fritextsvar).
  - Lägg också med en plain-text-version (Resend `text:`) för bättre deliverability.
- Inga DB-ändringar.

**Kantfall:**
- Om `formatted_raw_data` finns och är välformaterad – använd den som källa (matchar exakt det kunden såg), annars fall tillbaka på `answers` + `schema`.
- Om svar saknas helt → "Inga anamnes-svar registrerade".
- Personnummer: filtrera bort fält vars `id`/`label` matchar `personnummer|personal_number|ssn` som extra säkerhetsnät.

---

### 2. Glasögon-styrkor: ±8 D-flöde

**Nuvarande problem:** Kryssrutan "±8,00 D eller mer" finns i `VisualAcuityMeasurement.tsx` men sparar bara en flagga (sph=8) – det går inte att registrera de exakta styrkorna. Christian behöver kunna ange dem när rutan kryssas i. Linser ska aldrig ha styrkor.

**Förändringar i `VisualAcuityMeasurement.tsx`:**
- Behåll kryssrutan **"Överstiger ±8 dioptrier"** – visas **endast om "Använder glasögon" är ikryssat** (inte för linser, inte för "ingen korrektion"). Idag är den bunden till `licenseCategory === 'higher'`; det villkoret tas bort så det gäller alla behörigheter när glasögon används.
- Dela `uses_correction` till två separata kryssrutor:
  - **"Använder glasögon"** → kan visa ±8 D-rutan + ev. styrke-fält.
  - **"Använder kontaktlinser"** → inga styrke-fält alls.
  (Idag är det en kombi-checkbox `glasses_or_lenses` – det skiljer inte på dem.)
- När **"Överstiger ±8 dioptrier"** kryssas i visas ett kompakt fält-block:
  - OD: Sfär, Cylinder, Axel, (Add valfritt)
  - OS: Sfär, Cylinder, Axel, (Add valfritt)
  - Mappar mot befintliga DB-kolumner `glasses_prescription_od_sph/cyl/axis/add` + os-motsvarigheter (ingen migration).
- När rutan **inte** är ikryssad → inga styrke-fält, inga värden sparas.
- `ExaminationSummary.tsx` visar redan styrkor om de finns – fungerar automatiskt.
- Mejlet kan inkludera styrkor om de är angivna (under en "Glasögonstyrkor"-rubrik).

---

### 3. Internt testprotokoll vid ändringar

Inte en kodändring, men en arbetsrutin som dokumenteras:

- En kort checklista skrivs in i `FLOWS.md` (eller ny `docs/TESTING_CHECKLIST.md`):
  1. Kör flödet som **kund** (consent → anamnes → submit) på mobil.
  2. Kör som **assistent** (Genomför / Journalför i Servit) – välj **varje** av de fyra utfallen i tur och ordning.
  3. Kör som **optiker** – öppna mejlet, kontrollera att alla svar finns.
  4. Verifiera båda spåren: App-spåret (visus i appen) + Servit-spåret (direkt journalföring).
- Christian använder sig själv som test-optiker (redan klart). Hugo som backup.
- Innan jag säger "klart" till dig kör jag igenom listan själv mot preview-URL:en.

---

### Filer som ändras

```text
supabase/functions/notify-optician-driving-license/index.ts   # Mejlinnehåll (svar + kundnr)
src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx  # ±8 D-fält + glas/lins-split
docs/TESTING_CHECKLIST.md                                     # Ny – testrutin
```

Inga DB-migrationer, inga nya secrets, inga nya edge functions.

---

### Ordning i implementation

1. Mejlet – störst direkt nytta för Christian.
2. ±8 D-flödet – fixar konkret blocker i Anamnesportalen.
3. Testchecklistan + jag kör igenom alla utfall mot preview innan jag rapporterar tillbaka.

Säg till om du vill att jag ändrar något – annars kör jag.