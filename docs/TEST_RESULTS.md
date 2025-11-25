# API Test Results Template

> ⚠️ **VIKTIGT: Detta är en MALL för testresultat**
> 
> Resultaten nedan är **förväntade värden**, INTE faktiska testresultat.
> Du måste köra testerna manuellt och uppdatera detta dokument med verkliga resultat.

---

## 📋 Hur du kör testerna

### Förberedelser

1. **Skapa en API-nyckel:**
   - Logga in i Anamnesportalen Admin Panel
   - Gå till "API-integration" → "Skapa ny nyckel"
   - Kopiera API-nyckeln (börjar med `anp_live_` eller `anp_test_`)
   - Spara nyckeln säkert - den visas bara en gång!

2. **Sätt miljövariabler (valfritt, för enklare testning):**
   ```bash
   export API_KEY="anp_test_din_nyckel_här"
   export API_BASE="https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1"
   ```

### Kör testerna

Kör varje `curl`-kommando nedan i terminalen och jämför svaret med förväntat resultat.

---

## Test Environment

- **Date:** `[FYLL I DATUM]`
- **API Base URL:** `https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1`
- **Environment:** `[sandbox/production]`
- **API Key Used:** `anp_test_***` (dölj fullständig nyckel)
- **Tested By:** `[DITT NAMN]`

---

## Test Scenarios

### Test 1: Create Form Link (Happy Path)

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/issue-form-token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "bookingId": "test_booking_001",
    "formType": "Synundersökning",
    "storeName": "Stockholm Centrum",
    "firstName": "Test Patient"
  }'
```

**Förväntat resultat (200 OK):**
```json
{
  "success": true,
  "accessToken": "...",
  "entryId": "...",
  "formUrl": "https://anamnesportalen.se/form?token=...",
  "qrCodeUrl": "https://anamnesportalen.se/api/qr?token=...",
  "expiresAt": "2025-12-02T10:00:00Z",
  "formId": "...",
  "organizationId": "..."
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 2: Get Anamnesis (Not Completed)

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/get-anamnesis" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "bookingId": "test_booking_001"
  }'
```

**Förväntat resultat (409 Conflict):**
```json
{
  "error": "Anamnesis not completed yet",
  "bookingId": "test_booking_001",
  "status": "pending",
  "code": "ANAMNESIS_NOT_READY"
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 3: Invalid API Key

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/issue-form-token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key_12345" \
  -d '{
    "bookingId": "test_booking_002",
    "formType": "Synundersökning"
  }'
```

**Förväntat resultat (401 Unauthorized):**
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 4: Missing Required Fields

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/issue-form-token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "formType": "Synundersökning"
  }'
```

**Förväntat resultat (400 Bad Request):**
```json
{
  "error": "Missing required parameter: bookingId",
  "code": "MISSING_REQUIRED_FIELD"
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 5: Invalid Form Type

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/issue-form-token" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "bookingId": "test_booking_003",
    "formType": "InvalidExamType"
  }'
```

**Förväntat resultat (404 Not Found):**
```json
{
  "error": "No active form found for type: InvalidExamType",
  "code": "FORM_NOT_FOUND"
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 6: Get Non-Existent Anamnesis

**Status:** ⏳ EJ TESTAT

**Kör detta kommando:**
```bash
curl -X POST "$API_BASE/get-anamnesis" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "bookingId": "nonexistent_booking_999"
  }'
```

**Förväntat resultat (404 Not Found):**
```json
{
  "error": "No anamnesis found for this booking",
  "bookingId": "nonexistent_booking_999",
  "code": "ANAMNESIS_NOT_FOUND"
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

### Test 7: Complete Flow (End-to-End)

**Status:** ⏳ EJ TESTAT

**Steg:**
1. Skapa formulärlänk (Test 1)
2. Öppna `formUrl` i webbläsaren
3. Fyll i formuläret helt
4. Skicka in formuläret
5. Hämta anamnes via API

**Kör detta kommando (efter att formuläret är ifyllt):**
```bash
curl -X POST "$API_BASE/get-anamnesis" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "bookingId": "test_booking_001",
    "includeRawData": true
  }'
```

**Förväntat resultat (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookingId": "test_booking_001",
    "status": "ready",
    "patientName": "Test Patient",
    "summary": "...",
    "answers": { ... },
    "submittedAt": "...",
    "rawData": "..."
  }
}
```

**Faktiskt resultat:**
```
[KLISTRA IN SVAR HÄR]
```

**Resultat:** ⬜ PASS / ⬜ FAIL

---

## Test Summary

| Test | Beskrivning | Status |
|------|-------------|--------|
| 1 | Create Form Link (Happy Path) | ⏳ EJ TESTAT |
| 2 | Get Anamnesis (Not Completed) | ⏳ EJ TESTAT |
| 3 | Invalid API Key | ⏳ EJ TESTAT |
| 4 | Missing Required Fields | ⏳ EJ TESTAT |
| 5 | Invalid Form Type | ⏳ EJ TESTAT |
| 6 | Get Non-Existent Anamnesis | ⏳ EJ TESTAT |
| 7 | Complete Flow (End-to-End) | ⏳ EJ TESTAT |

**Totalt:** 0/7 testade

---

## Anteckningar

```
[Skriv eventuella observationer, buggar eller problem här]
```

---

## Signoff

- [ ] Alla tester körda
- [ ] Alla PASS-tester verifierade
- [ ] Alla FAIL-tester rapporterade som issues
- [ ] Dokumentet uppdaterat med faktiska resultat

**Testat av:** _________________ **Datum:** _________________
