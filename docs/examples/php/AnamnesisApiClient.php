<?php
/**
 * Anamnesportalen API Client - PHP
 * 
 * Exempel på hur man integrerar med Anamnesportalen från PHP
 */

class AnamnesisApiClient {
    private $apiKey;
    private $baseUrl;
    private $timeout;

    public function __construct($apiKey, $options = []) {
        $this->apiKey = $apiKey;
        $this->baseUrl = $options['baseUrl'] ?? 'https://jawtwwwelxaaprzsqfyp.supabase.co/functions/v1';
        $this->timeout = $options['timeout'] ?? 30;
    }

    /**
     * Skapa formulärlänk för en bokning
     */
    public function createFormLink($bookingData) {
        $url = $this->baseUrl . '/issue-form-token';
        
        $response = $this->makeRequest('POST', $url, $bookingData);
        
        if ($response['success']) {
            error_log('✅ Form link created: ' . $response['data']['formUrl']);
            return $response['data'];
        } else {
            throw new Exception('API Error: ' . $response['error']);
        }
    }

    /**
     * Hämta färdig anamnes
     */
    public function getAnamnesis($bookingId, $options = []) {
        $url = $this->baseUrl . '/get-anamnesis';
        
        $requestData = [
            'bookingId' => $bookingId,
            'includeRawData' => $options['includeRawData'] ?? false,
            'includeDrivingLicense' => $options['includeDrivingLicense'] ?? false
        ];
        
        $response = $this->makeRequest('POST', $url, $requestData);
        
        if ($response['success']) {
            error_log('✅ Anamnesis fetched for: ' . $bookingId);
            return $response['data'];
        } else {
            // Hantera specifika error codes
            if ($response['code'] === 'ANAMNESIS_NOT_FOUND') {
                return ['status' => 'not_found', 'bookingId' => $bookingId];
            } elseif ($response['code'] === 'ANAMNESIS_NOT_READY') {
                return ['status' => 'not_ready', 'bookingId' => $bookingId];
            }
            
            throw new Exception('API Error: ' . $response['error']);
        }
    }

    /**
     * Intern: Gör HTTP request
     */
    private function makeRequest($method, $url, $data = null) {
        $ch = curl_init();
        
        $headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ];
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method
        ]);
        
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception('Network error: ' . $error);
        }
        
        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            return [
                'success' => false,
                'error' => $decoded['error'] ?? 'Unknown error',
                'code' => $decoded['code'] ?? 'UNKNOWN'
            ];
        }
        
        return [
            'success' => true,
            'data' => $decoded
        ];
    }
}

// ========================================
// Användningsexempel
// ========================================

function example() {
    // Initiera client
    $client = new AnamnesisApiClient($_ENV['ANAMNESIS_API_KEY']);

    // 1. Skapa formulärlänk vid bokning
    $linkResult = $client->createFormLink([
        'bookingId' => 'booking_12345',
        'formType' => 'Synundersökning',
        'storeName' => 'Stockholm Centrum',
        'firstName' => 'Anna',
        'personalNumber' => '19900101-1234',
        'bookingDate' => '2025-11-25T14:00:00Z',
        'metadata' => [
            'serveItBookingId' => 'SI-12345'
        ]
    ]);

    echo "Form URL to send to customer: " . $linkResult['formUrl'] . "\n";
    echo "QR Code URL: " . $linkResult['qrCodeUrl'] . "\n";

    // 2. Senare: Hämta färdig anamnes
    $anamnesis = $client->getAnamnesis('booking_12345');

    if ($anamnesis['status'] === 'not_ready') {
        echo "Patient has not completed the form yet\n";
    } else {
        echo "Formatted summary: " . $anamnesis['formattedSummary'] . "\n";
        echo "AI summary: " . $anamnesis['aiSummary'] . "\n";
    }
}

// Kör exempel om skriptet körs direkt
if (basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
    example();
}
?>
