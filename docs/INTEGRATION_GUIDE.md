# Integration Guide: ServeIT → Anamnesportalen

Denna guide visar steg-för-steg hur du integrerar ServeIT med Anamnesportalen.

## Förutsättningar

- [ ] API-nyckel från Anamnesportalen (production eller sandbox)
- [ ] Tillgång till ServeIT-konfiguration
- [ ] Utvecklingsmiljö för testning

## Steg 1: Skaffa API-nyckel

1. Logga in på [Anamnesportalen Admin Panel](https://anamnesportalen.se/admin)
2. Navigera till **API Integration**
3. Klicka **Skapa ny API-nyckel**
4. Välj miljö: **Sandbox** för testning, **Production** för live
5. Ge nyckeln ett namn (t.ex. "ServeIT Production")
6. Spara både **API Key** och **Secret** säkert i ett lösenordshanteringssystem

⚠️ **Viktigt:** Secret visas bara en gång!

## Steg 2: Implementera "Skapa formulärlänk"

När en bokning skapas i ServeIT, gör ett API-anrop till Anamnesportalen.

### Integration Point i ServeIT

Lokalisera koden där:
- En ny bokning skapas
- Bokningsbekräftelse/påminnelse skickas

### Kod-exempel

Se [`examples/nodejs/anamnesis-client.js`](./examples/nodejs/anamnesis-client.js) för komplett exempel.

```javascript
// När bokning skapas i ServeIT
async function createBooking(bookingData) {
  // 1. Skapa bokning i ServeIT
  const booking = await serveIT.createBooking(bookingData);
  
  // 2. Skapa formulärlänk i Anamnesportalen
  const anamnesLink = await fetch(
    'https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/issue-form-token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANAMNESIS_API_KEY
      },
      body: JSON.stringify({
        bookingId: booking.id,
        formType: 'Synundersökning',
        storeName: booking.store.name,
        firstName: booking.customer.firstName,
        personalNumber: booking.customer.ssn,
        bookingDate: booking.dateTime,
        metadata: {
          serveItBookingId: booking.id
        }
      })
    }
  );
  
  const response = await anamnesLink.json();
  
  // 3. Spara token i ServeIT-databasen
  await serveIT.saveAnamnesisToken(booking.id, {
    token: response.accessToken,
    entryId: response.entryId,
    formUrl: response.formUrl
  });
  
  // 4. Inkludera länk i bokningsbekräftelse
  return {
    booking,
    anamnesisUrl: response.formUrl
  };
}
```

### SMS/Email Template

Uppdatera er bekräftelsemall:

```
Hej {firstName}!

Din bokning är bekräftad:
📅 {bookingDate} kl {bookingTime}
📍 {storeName}

Fyll i din hälsodeklaration innan besöket:
🔗 {anamnesisUrl}

Hälsningar,
{storeName}
```

## Steg 3: Implementera "Hämta anamnes"

När optikern öppnar en journal i ServeIT, hämta färdig anamnesdata.

### Integration Point i ServeIT

Lokalisera koden där:
- Optikern öppnar en patients journal
- Journal-vyn renderas

### Kod-exempel

Se [`examples/nodejs/anamnesis-client.js`](./examples/nodejs/anamnesis-client.js) för komplett exempel.

```javascript
// När optiker öppnar journal
async function openJournal(bookingId) {
  // 1. Hämta bokning från ServeIT
  const booking = await serveIT.getBooking(bookingId);
  
  // 2. Kontrollera om anamnes finns
  if (!booking.anamnesisToken) {
    return { booking, anamnesis: null };
  }
  
  // 3. Hämta anamnes från Anamnesportalen
  try {
    const response = await fetch(
      'https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1/get-anamnesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ANAMNESIS_API_KEY
        },
        body: JSON.stringify({
          bookingId: booking.id
        })
      }
    );
    
    if (response.status === 404) {
      // Patient har inte fyllt i ännu
      return { booking, anamnesis: { status: 'not_filled' } };
    }
    
    if (response.status === 409) {
      // Patient har påbörjat men inte skickat in
      return { booking, anamnesis: { status: 'in_progress' } };
    }
    
    const data = await response.json();
    
    // 4. Visa anamnes i journal-vyn
    return {
      booking,
      anamnesis: data.data
    };
    
  } catch (error) {
    console.error('Failed to fetch anamnesis:', error);
    return { booking, anamnesis: { status: 'error' } };
  }
}
```

### UI-integration i journal

```html
<!-- I ServeIT journal-vy -->
<div class="anamnesis-section">
  <h3>Hälsodeklaration</h3>
  
  {if anamnesis.status === 'ready'}
    <div class="anamnesis-content">
      <p><strong>Ifylld:</strong> {anamnesis.submittedAt}</p>
      <div class="formatted-text">
        {anamnesis.formattedSummary}
      </div>
      <button onclick="insertIntoJournal()">
        Infoga i journal
      </button>
    </div>
  {elseif anamnesis.status === 'not_filled'}
    <p class="warning">Patienten har inte fyllt i hälsodeklarationen än.</p>
  {/if}
</div>
```

## Steg 4: Testa i Sandbox

Innan du går live, testa hela flödet i sandbox:

### Checklist

- [ ] Skapa test-API-nyckel (`anp_test_`)
- [ ] Skapa testbokning i ServeIT
- [ ] Verifiera att formulärlänk genereras
- [ ] Öppna länken och fyll i formulär
- [ ] Verifiera att optikern kan hämta anamnes i journal
- [ ] Testa felhantering (ogiltig bookingId, ej ifyllt formulär)

### Vanliga testscenarier

1. **Lyckad flow:** Bokning → Länk → Ifyllning → Hämtning
2. **Patient fyllt ej i:** Hämta före ifyllning (förväntad 409)
3. **Felaktig bookingId:** Hämta med fel ID (förväntad 404)
4. **Utgången länk:** Försök fylla i efter 7 dagar

## Steg 5: Go Live

När sandbox-tester är godkända:

1. Skapa production API-nyckel (`anp_live_`)
2. Uppdatera environment variables i ServeIT
3. Deploy till production
4. Övervaka logs i 24 timmar
5. Bekräfta med några riktiga bokningar

## Felsökning

### Problem: "Invalid API key"

**Lösning:**
- Kontrollera att X-API-Key header inkluderas
- Verifiera att rätt miljö används (sandbox vs production)
- Kontrollera att nyckeln är aktiv i admin panel

### Problem: "Form not found"

**Lösning:**
- Kontrollera att `formType` stämmer med tillgängliga formulär
- Verifiera att formuläret är aktivt för er organisation

### Problem: "Anamnesis not ready"

**Normal situation:** Patienten har inte slutfört formuläret än.

**Lösning:** Visa status i journal-vyn och låt optikern veta.

## Support

**Teknisk support:** support@anamnesportalen.se  
**Telefon:** 08-123 456 78  
**Svarstid:** Inom 24 timmar

## Changelog

- **2025-11-25:** Initial release v1.0.0
