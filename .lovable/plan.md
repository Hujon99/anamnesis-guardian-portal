# Plan: Körkortsflöde – nästa feedback-runda

Smala, riktade ändringar som bygger vidare på befintliga komponenter (`VisualAcuityMeasurement`, `RecommendationEngine`, `ServitJournalDialog`, `notify-optician-driving-license`). Inga nya filer eller parallella system.

## 1. Behörighet ("Förlängning högre behörighet") tappas vid visussteget

**Återanvänds:** `VisualAcuityMeasurement.detectedLicenseCategory` (memo) + `userOverridden`-flagga som redan finns.

**Problem:** Detektionen matchar `"högre"`, `"c1"`, `"d1"` osv. men anamnesfrågan kan ha exakta etiketter som `"Förlängning högre behörighet"`, `"Förlängning lägre behörighet"`, `"Taxiförarlegitimation"`. Vid första render hinner `entry?.answers` inte alltid in → defaultar till `'lower'`. Sedan markerar användaren steget och `userOverridden` blir indirekt sant via re-mounts → låst på fel värde.

**Fix i `VisualAcuityMeasurement.tsx`:**

- Bredda detektionen: matcha hela frasen `"förlängning högre"` → `'higher'`, `"förlängning lägre"` → `'lower'`, `"taxi"` → `'taxi'`. Lägg in i `detectedLicenseCategory`-memo före befintliga regex-checks.
- Vid uppstart: läs först `examination.notes` rad 1 (`Behörighetstyp: …`) → mappa exakt mot `LICENSE_CATEGORIES[*].name`. Det finns redan men har en bug: jämförelsen kräver exakt name-träff, annars faller den ner i lower-substring-check som missar `"Förlängning högre behörighet"`. Lägg till `förlängning högre`-substring i fallback.
- `userOverridden` ska bara sättas i `onValueChange` (är redan så). Säkerställ att `useEffect` inte överskriver när detected ändras till samma värde (no-op skydd för att undvika onödig re-render).

**Resultat:** valt värde överlever varje fram-/tillbaka-navigering tills användaren manuellt byter.

## 2. Sammanvägd rekommendation: visus + anamnes + ±8 D

**Återanvänds:** `RecommendationEngine.tsx` har redan `collectAnamnesisFindings` + `collectVisusFindings` + `computeSuggestion` med hierarki.

**Saknas idag:**

- ±8 D-flaggan (`uses_glasses && prescription_over_8d` ⇒ nu `uses_glasses && prescription_over_8d` är ersatt av kategori `glasses_over_8d`) räknas inte som en avvikelse i visus-sektionen.
- Vid kombinerade fynd visas rationale men inte en explicit punktlista (`Skäl: 1) … 2) …`).

**Fix:**

- `collectVisusFindings(examination)`: lägg till `if (examination.uses_glasses && examination.prescription_over_8d) findings.push("Glasstyrka över ±8 D – Transportstyrelsen ska informeras")`.
- `computeSuggestion`: när hierarkin är `optician_contact_first` eller `approved_recommend_exam`, bygg `rationale` som en sammansatt sträng: `Skäl: ${[...anamnesis, ...visus].join(' · ')}`. Hierarki-regeln (visus < hård gräns ⇒ alltid `not_approved`) lämnas oförändrad.
- Ingen ny komponent — befintligt färgkodat utfallsblock visar den utökade rationale.

## 3. ServeIT-dialogen: anamnesen överst, bedömning/knappar nederst

**Återanvänds:** `ServitJournalDialog` har redan två-kolumns layout med `FormAnswersDisplay` till höger.

**Fix i `ServitJournalDialog.tsx`:**

- Byt från `lg:grid-cols-2` till en vertikal stack:
  - **Topp:** patientkort + `<FormAnswersDisplay entry={entry} hideNavigation />` i en scroll-container med `max-h-[45vh] overflow-y-auto`.
  - **Mitten:** kundnummer-fält, optiker-väljare, anteckning (collapsible).
  - **Botten:** Bedömning (`Select` med `OUTCOME_OPTIONS`) följt av `DialogFooter` med Avbryt/Bekräfta.
- Ta bort `aside`-grid-wrappern (rader 287, 470–476) och rör om JSX-ordningen. `DialogContent` minskar till `max-w-3xl` (en kolumn behöver inte 5xl).
- Mobil: stacken funkar redan utan ändringar.

## 4. Optikermail – verifiera städningen efter Christians exempel

**Redan på plats i `supabase/functions/notify-optician-driving-license/index.ts`:**

- `EXCLUDED_KEYS` + `EXCLUDED_KEY_PREFIXES` filtrerar `consent_*`, `terms_version`, `privacy_policy_version`, `gdpr_*`, `id_verification_*`, `verified_*`.
- `isFollowup` + `isAnswerEmpty` hoppar över tomma "Om ja/nej, beskriv".

**Komplettera:**

- Lägg till `'created_at'`, `'updated_at'`, `'sent_at'`, `'expires_at'`, `'access_token'`, `'redacted_at'`, `'is_redacted'`, `'is_kiosk_mode'`, `'require_supervisor_code'`, `'booking_id'`, `'booking_date'`, `'first_name'`, `'patient_identifier'`, `'examination_type'`, `'optician_id'`, `'store_id'`, `'form_id'`, `'organization_id'`, `'created_by'`, `'created_by_name'`, `'is_magic_link'`, `'auto_deletion_timestamp'`, `'formatted_raw_data'`, `'ai_summary'`, `'scoring_result'`, `'personal_number'`, `'id_type'` i `EXCLUDED_KEYS` (skydd om något av dessa råkar lagras i `answers`-jsonb).
- Filtrera bort UUID-värden i "Övriga svar": om `value` matchar regex `^[0-9a-f]{8}-…$` → hoppa.
- Uppdatera följdfråge-regex till även `/^\s*(om\s+(ja|nej)|beskriv|specificera|annat)\b/i`.

## 5. Optiker får "Access Denied" på dashboard

**Undersökning som krävs innan kod skrivs:**

- Läs `src/pages/Dashboard.tsx` + `ProtectedRoute`-användning för dashboard-routen i `src/App.tsx`. Verifiera om `requireRole={['admin','optician']}` används eller bara `admin`.
- Kontrollera `useUserRole`/`useRobustUserRole` så att Supabase-rollen `'optician'` (default i `users.role`) returneras korrekt även när Clerk-orgrollen är `org:member`.
- Spåra ev. `useSystemAdmin` eller `useIsAdmin`-guards som blockerar dashboard-vyn för opticians.

**Sannolik fix (verifieras först):** justera ProtectedRoute-anropet i `App.tsx`/`Dashboard.tsx` till `requireRole={['admin','optician','member']}` eller ta bort onödig roll-restriktion. Inga RLS-ändringar behövs då dashboard-queries redan filtrerar på `org_id` via JWT.

**Inga DB-migrationer planeras** — RLS-policies på `anamnes_entries`, `driving_license_examinations` m.fl. tillåter redan alla org-medlemmar.

## Filer som kommer ändras

- `src/components/Optician/DrivingLicense/VisualAcuityMeasurement.tsx` — bredare behörighetsdetektion + parse-fallback.
- `src/components/Optician/DrivingLicense/RecommendationEngine.tsx` — ±8 D i visusfynd + sammansatt rationale.
- `src/components/Optician/DrivingLicense/ServitJournalDialog.tsx` — vertikal layout, anamnes överst.
- `supabase/functions/notify-optician-driving-license/index.ts` — utökad EXCLUDED_KEYS + UUID-filter + bredare followup-regex.
- `src/pages/Dashboard.tsx` eller `src/App.tsx` — justera ProtectedRoute-rollkrav (efter verifiering av exakt orsak).

## Verifiering

- Skapa entry med svar `"Förlängning högre behörighet"` → öppna körkortsflödet → klicka fram-tillbaka → behörigheten kvarstår.
- Visus 0,3 binokulärt + diabetes "Ja" + glasögon >±8 D → utfall = `Ej godkänd / hänvisa till optiker`, rationale listar alla tre.
- Öppna ServeIT-dialogen → anamnessvar syns överst, bedömning + Bekräfta-knapp underst.
- Skicka testmail → inga `consent_*`, `terms_*`, UUID-rader eller tomma "Om nej, beskriv".
- Logga in som optiker (icke-admin) → `/dashboard` öppnas utan "Behörighet saknas".