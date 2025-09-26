/**
 * Safari detection and compatibility utilities.
 * Provides functions to detect Safari browser and apply Safari-specific optimizations
 * for form loading, state management, and API requests.
 */

export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const getSafariOptimizedConfig = () => {
  const safari = isSafari();
  
  return {
    isSafari: safari,
    // API request settings
    maxRetries: safari ? 1 : 2,
    requestTimeout: safari ? 8000 : 10000,
    requestCooldown: safari ? 4500 : 3000,
    
    // State transition settings  
    transitionDelay: safari ? 100 : 300,
    initialRenderDelay: safari ? 200 : 500,
    
    // Query cache settings
    staleTime: safari ? 20 * 60 * 1000 : 15 * 60 * 1000, // 20min vs 15min
    retryDelay: safari ? 2000 : 5000,
    
    // Circuit breaker settings
    maxLoadingTime: safari ? 8000 : 10000,
    
    // Debug logging
    debugPrefix: safari ? '[Safari]' : ''
  };
};

export const logSafariDebug = (message: string, ...args: any[]) => {
  if (isSafari()) {
    console.log(`[Safari Debug]: ${message}`, ...args);
  } else {
    console.log(message, ...args);
  }
};