# Rensa upp körkort-återblicksvyn — snabb, robust, ingen död kod

## Vad användaren upplever

När man (assistent eller optiker) öppnar en journalförd körkortskoll i listan visas **bara en liten "Verifierad behörighet"-rad** och resten av vyn känns som att den hänger. Vi har också flera filer som beskriver samma sak (duplicerad/död kod) — det gör det svårt att underhålla.

## Vad vi har grävt fram

1. **Död kod som inte används av någon** — riskerar att förvirra framtida ändringar:
   - `src/components/Optician/EntryDetails/DrivingLicenseOpticianDecision.tsx` (gamla beslutskortet, ersatt av nya `DrivingLicenseResults`)
   - `src/components/Optician/EntryDetails/CopyableExaminationSummary.tsx` (gamla kopiera-sammanfattning, ersatt av `ServeitInstructions`)
2. **Orphan-läge: examination_status='in_progress' men entry.status='journaled'** — händer när användaren startar "Genomför i appen", går framåt men inte slutför visus-stegen. `DrivingLicenseResults` ritar då en nästan tom vy ("—" överallt), vilket ser ut som att den laddar.
3. **Body-renderingen tar tid** för att `ServeitInstructions` alltid mountar och kör `extractAnamnesAnswer` på hela `answers`-objektet på varje render — fixas med stabil memoisering och en kort skeleton i körkort-tabben tills `entry.driving_license_status` faktiskt finns.
4. **Behörighet** — RLS tillåter både assistent och optiker att läsa `driving_license_examinations` per organisation. Ingen UI-koll i den nya vyn gatar bort assistenter. Vi behåller det så.

## Ändringar

### Filer som tas bort (död kod)

- `src/components/Optician/EntryDetails/DrivingLicenseOpticianDecision.tsx`
- `src/components/Optician/EntryDetails/CopyableExaminationSummary.tsx`

### `src/components/Optician/EntryDetails/DrivingLicenseResults.tsx`

- Lägg till en tydlig **"Ofullständig undersökning"-banner** högst upp när `examination.examination_status !== 'completed'` — då har "Genomför i appen" startats men aldrig slutförts. Texten förklarar exakt vad som hänt och länkar tillbaka till körkortsflödet ("Fortsätt undersökningen") så användaren förstår varför vyn ser tom ut.
- Behåll övriga sektioner men endast rendera ServeIT-guiden om `examination` har minst grunddata (legitimation eller visus). Saknas allt visas i stället en kort "Inga undersökningsdata sparades" — inte en halvtom guide.
- Säkerställ att inga åtgärdsknappar visas (det här är ren visningsvy oavsett roll).

### `src/components/Optician/EntryDetails/ModalTabContent.tsx`

- I körkort-tabben: om `entry.driving_license_status` är `undefined` (bulk-fetchen är inte färdig) — visa skeleton i max 1 sekund i stället för att försöka rendera. Idag är `isLoading` hårdkodad till `false`, vilket gör att vyn renderas med tom data och känns "stuck".
- Om `entry.driving_license_status?.examination` saknas helt visas en informativ tom-state ("Inget körkortsprotokoll har sparats för den här patienten ännu.") — inte den nuvarande tysta "Ingen körkortsdata tillgänglig"-raden.

### `src/components/Optician/DrivingLicense/ServeitInstructions.tsx`

- Stabilisera `useMemo`-deps: idag triggas omräkning på varje `answers`/`entry`/`examination`-referensbyte. Memoisera på primitiva nycklar (entry.id + examination.id + examination.updated_at) så att tunga `extractAnamnesAnswer`-passet bara körs när det faktiskt ändras.
- Inga funktionella ändringar i layouten.

## Tekniska detaljer

- Inga DB-migrationer. RLS-policyn `Organization members can view driving license examinations` är redan korrekt (org-baserad, ingen roll-filtrering).
- TypeScript-strict bibehålls.
- Inga ändringar i `DrivingLicenseExamination`-flödet (steg 1–4) eller `ServitJournalDialog`-genvägen — de fungerar.

## Verifiering

- Öppna en journalförd körkortskoll (app eller ServeIT) → ren sammanfattning + ServeIT-guide visas snabbt, ingen "stuck"-känsla.
- Öppna ett "in_progress"-fall (orphan) → tydlig banner förklarar att undersökningen inte är klar, ingen halvtom guide.
- Som assistent och som optiker: samma vy, ingen åtgärdsknapp.
- Inga referenser till de borttagna komponenterna i hela `src/`.
