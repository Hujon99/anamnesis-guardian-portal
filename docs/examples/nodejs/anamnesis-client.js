/**
 * Anamnesportalen API Client - Node.js
 * 
 * Exempel på hur man integrerar med Anamnesportalen från Node.js/Express
 */

const axios = require('axios');

class AnamnesisApiClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1';
    this.timeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Skapa formulärlänk för en bokning
   */
  async createFormLink(bookingData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/issue-form-token`,
        bookingData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          timeout: this.timeout
        }
      );

      console.log('✅ Form link created:', response.data.formUrl);
      return response.data;

    } catch (error) {
      if (error.response) {
        // API returnerade ett error
        console.error('❌ API Error:', error.response.data);
        throw new Error(`API Error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        // Request skickades men inget svar mottogs
        console.error('❌ Network Error: No response from API');
        throw new Error('Network error: Could not reach API');
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Hämta färdig anamnes
   */
  async getAnamnesis(bookingId, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/get-anamnesis`,
        {
          bookingId,
          includeRawData: options.includeRawData || false,
          includeDrivingLicense: options.includeDrivingLicense || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          timeout: this.timeout
        }
      );

      console.log('✅ Anamnesis fetched for:', bookingId);
      return response.data.data;

    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 404) {
          console.log('ℹ️ Anamnesis not found for booking:', bookingId);
          return { status: 'not_found', bookingId };
        } else if (status === 409) {
          console.log('ℹ️ Anamnesis not ready yet:', bookingId);
          return { status: 'not_ready', bookingId };
        }

        console.error('❌ API Error:', data);
        throw new Error(`API Error: ${data.error || 'Unknown error'}`);
      }

      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// ========================================
// Användningsexempel
// ========================================

async function example() {
  // Initiera client
  const client = new AnamnesisApiClient(process.env.ANAMNESIS_API_KEY);

  // 1. Skapa formulärlänk vid bokning
  const linkResult = await client.createFormLink({
    bookingId: 'booking_12345',
    formType: 'Synundersökning',
    storeName: 'Stockholm Centrum',
    firstName: 'Anna',
    personalNumber: '19900101-1234',
    bookingDate: '2025-11-25T14:00:00Z',
    metadata: {
      serveItBookingId: 'SI-12345'
    }
  });

  console.log('Form URL to send to customer:', linkResult.formUrl);
  console.log('QR Code URL:', linkResult.qrCodeUrl);

  // 2. Senare: Hämta färdig anamnes
  const anamnesis = await client.getAnamnesis('booking_12345');

  if (anamnesis.status === 'not_ready') {
    console.log('Patient has not completed the form yet');
  } else {
    console.log('Formatted summary:', anamnesis.formattedSummary);
    console.log('AI summary:', anamnesis.aiSummary);
  }
}

module.exports = AnamnesisApiClient;

// Kör exempel om skriptet körs direkt
if (require.main === module) {
  example().catch(console.error);
}
