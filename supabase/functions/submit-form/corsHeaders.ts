
/**
 * This file defines CORS headers for cross-origin requests
 * to ensure proper access to the function from different domains.
 */

// Define CORS headers with expanded Access-Control-Allow-Headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, x-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};
