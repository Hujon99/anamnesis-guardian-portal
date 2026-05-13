# Justering: ServeitTransferView vs kollegans spec

## Status mot spec

Det jag byggde följer kollegans instruktion **nästan helt**, men två saker måste rättas:

| Spec-krav | Status |
|---|---|
| 7 sektioner i rätt ordning | ✅ |
| Banner: "skapa i ServeIT", "INTE journalföra", "mail skickat" | ✅ (mailtext växlar efter klick — du valde behåll) |
| Behörighet (intyget avser) | ✅ |
| Underlag + datum | ✅ |
| Identitet styrkt genom — visa "Körkort/Pass/ID-kort/..." | ❌ **Bug** — visar råa enum-strängen |
| Synskärpa utan korrektion (H/V/B) | ✅ |
| Synskärpa med korrektion (H/V/B) | ✅ |
| Korrektion: glasögon/linser + **över eller under ±8 D** | ❌ **Otillräcklig** — visar bara "±8 dioptrier" när flaggan är på, säger inget annars |
| Anamnesfrågor (ja/nej + kommentar, båda) | ✅ |
| Bedömning + optiker + anteckning | ✅ (du valde behåll) |

## Vad som ska fixas

### 1. Identitet styrkt genom — fel enum-mapping (bug)

`ID_TYPE_LABELS` i `ServeitTransferView.tsx` använder nycklar som inte finns i databasen. Riktiga enum-värden för `id_verification_type`:

```text
swedish_license       -> "Körkort"
swedish_id            -> "ID-kort"
passport              -> "Pass"
guardian_certificate  -> "Vårdnadshavares intyg"
```

Idag står `drivers_license / national_id / bank_id / other` → faller alltid tillbaka på råsträngen. Assistenten ser t.ex. "swedish_license" istället för "Körkort".

### 2. Korrektion — explicit ±8 D-text för glasögon

Spec: *"över eller under +8 dioptrier (ej relevant för linser, endast glasögon)"*.

Ny `buildCorrectionLabel`-logik:

- Inget alls använt → `—`
- Endast linser → `"Kontaktlinser"`
- Glasögon (+ ev. linser) → `"Glasögon — över ±8 D"` om `prescription_over_8d=true`, annars `"Glasögon — under ±8 D"`. Linser läggs efter med " + Kontaktlinser".

Så assistenten alltid ser ±8 D-statusen tydligt när det är glasögon, aldrig för enbart linser.

## Filer som ändras

- `src/components/Optician/DrivingLicense/ServeitTransferView.tsx`
  - Byt nycklar i `ID_TYPE_LABELS` (rad 73–79).
  - Skriv om `buildCorrectionLabel` (rad 87–94).

Inga andra filer berörs. Inga schema-ändringar. Inga ändringar i banner, sektionsordning, bedömning/optiker eller dashboard-filtret.

## Verifiering

- Öppna en körkortskoll med `id_type='swedish_license'` → ska visa "Körkort".
- Öppna en koll med `uses_glasses=true, prescription_over_8d=false` → "Glasögon — under ±8 D".
- Med `prescription_over_8d=true` → "Glasögon — över ±8 D".
- Endast linser → "Kontaktlinser" (inget ±8 D-text).
- TypeScript + lint clean.
