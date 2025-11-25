# Anamnesportalen API Dokumentation

Version: 1.1.0  
Senast uppdaterad: 2025-11-25

## 📋 OpenAPI Specifikation

En komplett maskinläsbar **OpenAPI 3.0.3**-specifikation finns i [`openapi.yaml`](./openapi.yaml).

### Användning av OpenAPI-spec

#### **Swagger UI (Interaktiv dokumentation)**
Öppna [Swagger Editor](https://editor.swagger.io/) och importera `openapi.yaml` för interaktiv API-dokumentation och testning.

#### **Postman**
1. Öppna Postman
2. Klicka på **Import** → **File** → Välj `openapi.yaml`
3. Postman genererar automatiskt en Collection med alla endpoints

#### **Kodgenerering**
Generera klient-bibliotek automatiskt för ditt språk:

```bash
# TypeScript/JavaScript
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g typescript-axios -o ./client

# PHP
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g php -o ./client

# Python
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g python -o ./client
```

---

## Översikt

Anamnesportalen API möjliggör integration med externa bokningssystem som ServeIT. API:et använder REST och JSON för kommunikation.

**Base URL:** `https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1`

**App URL:** `https://anamnes.binokeloptik.se`

## Autentisering

Alla API-anrop kräver en API-nyckel i headern:

```http
X-API-Key: anp_live_xxxxxxxxxxxxx
```

### Skaffa API-nyckel

1. Logga in på Anamnesportalen som admin
2. Gå till Admin Panel → API Integration
3. Skapa ny API-nyckel
4. Spara både API Key och Secret säkert

### Miljöer

- **Production:** `anp_live_` prefix
- **Sandbox:** `anp_test_` prefix (använder testdata)

---

## Endpoints

### 1. Skapa formulärlänk

**POST** `/issue-form-token`

Skapar en unik formulärlänk för en patient. Anropas när en bokning skapas i bokningssystemet.

#### Request Headers
```http
Content-Type: application/json
X-API-Key: anp_live_xxxxxxxxxxxxx
```

#### Request Body
```json
{
  "bookingId": "booking_12345",
  "formType": "Synundersökning",
  "storeName": "Stockholm Centrum",
  "firstName": "Anna",
  "personalNumber": "19900101-1234",
  "bookingDate": "2025-11-25T14:00:00Z",
  "expiresInDays": 7,
  "metadata": {
    "serveItBookingId": "SI-12345"
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | string | ✅ | Unikt ID från bokningssystemet |
| formType | string | ✅* | Typ av undersökning (se typer nedan) |
| formId | uuid | ✅* | Direkt form ID (alternativ till formType) |
| storeName | string | ⚪ | Namn på butik/klinik (skapas om den inte finns) |
| storeId | uuid | ⚪ | UUID för butik (om känt) |
| firstName | string | ⚪ | Patientens förnamn |
| personalNumber | string | ⚪ | Personnummer (ÅÅÅÅMMDD-XXXX) |
| bookingDate | ISO 8601 | ⚪ | Datum för undersökning |
| expiresInDays | number | ⚪ | Dagar tills länken utgår (default: 7) |
| metadata | object | ⚪ | Valfri metadata från externt system |

*Antingen `formType` ELLER `formId` måste anges.

#### Form Types
- `Synundersökning` - Standard synundersökning
- `Körkortsundersökning` - Körkortssyn
- `Linsundersökning` - Kontaktlinsanpassning
- `CISS-formulär` - CISS-formulär

#### Store-Form Validation

När en butik anges valideras att formuläret är aktivt för den butiken via `store_forms`-tabellen:
- Om ingen koppling finns skapas den automatiskt
- Om formuläret är inaktiverat för butiken returneras error `FORM_NOT_ACTIVE_FOR_STORE`

#### Response 200 (Success)
```json
{
  "success": true,
  "accessToken": "550e8400-e29b-41d4-a716-446655440000",
  "entryId": "7f3e4d2a-1b5c-4e9f-8d3a-9c7b6e5f4d3c",
  "formUrl": "https://anamnes.binokeloptik.se/form?token=550e8400...",
  "qrCodeUrl": "https://anamnes.binokeloptik.se/qr?token=550e8400...",
  "expiresAt": "2025-12-01T14:00:00Z",
  "formId": "3e7b9f1a-2c5d-4e8f-9a1b-6c7d8e9f0a1b",
  "organizationId": "org_xxxxxxxxx",
  "metadata": {
    "serveItBookingId": "SI-12345"
  }
}
```

#### Response 401 (Invalid API Key)
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

#### Response 403 (Form Not Active for Store)
```json
{
  "error": "Form is not active for this store",
  "code": "FORM_NOT_ACTIVE_FOR_STORE",
  "formId": "3e7b9f1a-2c5d-4e8f-9a1b-6c7d8e9f0a1b",
  "storeId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response 404 (Form Type Not Found)
```json
{
  "error": "No active form found for type: Synundersökning",
  "code": "FORM_NOT_FOUND"
}
```

#### cURL Example
```bash
curl -X POST https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/issue-form-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: anp_live_xxxxxxxxxxxxx" \
  -d '{
    "bookingId": "booking_12345",
    "formType": "Synundersökning",
    "storeName": "Stockholm Centrum",
    "firstName": "Anna",
    "bookingDate": "2025-11-25T14:00:00Z"
  }'
```

---

### 2. Hämta färdig anamnes

**POST** `/get-anamnesis`

Hämtar komplett anamnesdata när optikern öppnar journalen.

#### Request Headers
```http
Content-Type: application/json
X-API-Key: anp_live_xxxxxxxxxxxxx
```

#### Request Body
```json
{
  "bookingId": "booking_12345",
  "includeRawData": false,
  "includeDrivingLicense": false
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookingId | string | ✅ | Samma bookingId som användes vid skapande |
| includeRawData | boolean | ⚪ | Inkludera råa svar från formulär (default: false) |
| includeDrivingLicense | boolean | ⚪ | Inkludera körkortsdata (default: false) |

#### Response 200 (Success)
```json
{
  "success": true,
  "data": {
    "entryId": "7f3e4d2a-1b5c-4e9f-8d3a-9c7b6e5f4d3c",
    "bookingId": "booking_12345",
    "firstName": "Anna",
    "personalNumber": "19900101-1234",
    "status": "ready",
    "submittedAt": "2025-11-24T10:30:00Z",
    "examinationType": "Synundersökning",
    "bookingDate": "2025-11-25T14:00:00Z",
    "store": {
      "name": "Stockholm Centrum",
      "address": "Drottninggatan 1",
      "phone": "08-123 456",
      "email": "stockholm@optik.se"
    },
    "formattedSummary": "Patient rapporterar inga aktuella besvär...",
    "aiSummary": "Inga kontraindikationer. Patient har tidigare använt linser...",
    "scoringResult": {
      "totalScore": 12,
      "category": "low_risk"
    }
  }
}
```

#### Response 404 (Not Found)
```json
{
  "error": "No anamnesis found for this booking",
  "bookingId": "booking_12345",
  "code": "ANAMNESIS_NOT_FOUND"
}
```

#### Response 409 (Not Ready)
```json
{
  "error": "Anamnesis not completed yet",
  "bookingId": "booking_12345",
  "status": "pending",
  "code": "ANAMNESIS_NOT_READY"
}
```

#### cURL Example
```bash
curl -X POST https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/get-anamnesis \
  -H "Content-Type: application/json" \
  -H "X-API-Key: anp_live_xxxxxxxxxxxxx" \
  -d '{
    "bookingId": "booking_12345"
  }'
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/expired API key |
| 403 | Forbidden - Insufficient permissions or form not active for store |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource not in correct state |
| 500 | Internal Server Error |

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| INVALID_API_KEY | API-nyckeln är ogiltig | Kontrollera att X-API-Key är korrekt |
| API_KEY_EXPIRED | API-nyckeln har utgått | Skapa ny API-nyckel |
| INSUFFICIENT_PERMISSIONS | Nyckeln saknar behörighet | Kontrollera permissions i admin panel |
| MISSING_REQUIRED_FIELD | Obligatoriskt fält saknas | Kontrollera request body |
| FORM_NOT_FOUND | Formulärtyp finns inte | Kontrollera att formType är korrekt |
| FORM_NOT_ACTIVE_FOR_STORE | Formuläret är inaktiverat för butiken | Aktivera formuläret för butiken i admin |
| UNAUTHORIZED_FORM_ACCESS | Formuläret tillhör inte er organisation | Kontrollera formId |
| ANAMNESIS_NOT_FOUND | Ingen anamnes för bookingId | Kontrollera att patienten fyllt i formulär |
| ANAMNESIS_NOT_READY | Anamnes ej färdig | Vänta tills patient slutfört |

## Rate Limiting

- **Write operations** (issue-form-token): 100 requests/minut
- **Read operations** (get-anamnesis): 200 requests/minut

Vid överträdelse returneras status `429 Too Many Requests`.

## Best Practices

1. **Spara accessToken:** När du skapar en formulärlänk, spara `accessToken` och `entryId` i er databas kopplat till bookingId
2. **Poll inte:** Anropa inte get-anamnesis upprepade gånger. Implementera webhooks när tillgängligt
3. **Hantera timeout:** Använd 30 sekunders timeout för API-anrop
4. **Använd sandbox:** Testa alltid i sandbox-miljö först
5. **Logga errors:** Logga alla error codes för enklare felsökning

## Changelog

- **2025-11-25 v1.1.0:** 
  - Lagt till validering av store-form assignments
  - Ny felkod `FORM_NOT_ACTIVE_FOR_STORE`
  - Uppdaterat URL:er till `anamnes.binokeloptik.se`
- **2025-11-25 v1.0.0:** Initial release

## Support

Kontakta support@anamnesportalen.se för hjälp med integrationen.
