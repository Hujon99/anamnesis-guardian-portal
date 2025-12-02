/**
 * Consent Utilities
 * Handles consent validation using URL parameters as primary storage (mobile-safe)
 * with sessionStorage as backup for backward compatibility.
 * 
 * This approach solves the mobile browser issue where sessionStorage is cleared
 * when switching between apps or when the browser is killed by iOS/Android.
 */

const CONSENT_MAX_AGE_HOURS = 24;

export interface ConsentCheckResult {
  isValid: boolean;
  source: 'url' | 'session' | 'none';
}

/**
 * Checks if valid consent exists for the given organization/form
 * Prioritizes URL parameters over sessionStorage for mobile reliability
 */
export const checkConsent = (searchParams: URLSearchParams): ConsentCheckResult => {
  const consentKey = searchParams.get('org_id') || searchParams.get('form_id');
  
  // Check URL parameter first (most reliable on mobile)
  const urlConsent = searchParams.get('consent');
  const urlConsentTs = searchParams.get('consent_ts');
  
  if (urlConsent === 'true' && urlConsentTs) {
    try {
      const consentTime = new Date(urlConsentTs);
      const now = new Date();
      const hoursDiff = (now.getTime() - consentTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < CONSENT_MAX_AGE_HOURS) {
        // Restore sessionStorage for backward compatibility
        if (consentKey) {
          sessionStorage.setItem(`consent_given_${consentKey}`, 'true');
          sessionStorage.setItem(`consent_timestamp_${consentKey}`, urlConsentTs);
        }
        return { isValid: true, source: 'url' };
      }
    } catch (err) {
      console.warn('Error parsing consent timestamp from URL:', err);
    }
  }
  
  // Fallback to sessionStorage
  if (consentKey) {
    const sessionConsent = sessionStorage.getItem(`consent_given_${consentKey}`);
    if (sessionConsent === 'true') {
      return { isValid: true, source: 'session' };
    }
  }
  
  return { isValid: false, source: 'none' };
};

/**
 * Adds consent parameters to a URLSearchParams object
 */
export const addConsentParams = (params: URLSearchParams): void => {
  params.set('consent', 'true');
  params.set('consent_ts', new Date().toISOString());
};

/**
 * Preserves consent parameters from source to destination URLSearchParams
 */
export const preserveConsentParams = (
  source: URLSearchParams,
  destination: URLSearchParams
): void => {
  const consent = source.get('consent');
  const consentTs = source.get('consent_ts');
  
  if (consent) destination.set('consent', consent);
  if (consentTs) destination.set('consent_ts', consentTs);
};

/**
 * List of all customer-related URL parameters that should be preserved
 * through the entire form flow
 */
export const CUSTOMER_PARAMS = [
  'org_id',
  'form_id',
  'first_name',
  'last_name',
  'personal_number',
  'store_id',
  'store_name',
  'booking_date',
  'booking_id',
  'consent',
  'consent_ts',
] as const;

/**
 * Preserves all customer-related parameters from source to destination
 */
export const preserveCustomerParams = (
  source: URLSearchParams,
  destination: URLSearchParams
): void => {
  CUSTOMER_PARAMS.forEach(param => {
    const value = source.get(param);
    if (value) {
      destination.set(param, value);
    }
  });
};

/**
 * Creates a redirect URL to consent page with all current params preserved
 */
export const createConsentRedirectUrl = (currentParams: URLSearchParams): string => {
  const consentParams = new URLSearchParams();
  preserveCustomerParams(currentParams, consentParams);
  // Remove consent params since we're redirecting TO consent page
  consentParams.delete('consent');
  consentParams.delete('consent_ts');
  return `/consent?${consentParams.toString()}`;
};
