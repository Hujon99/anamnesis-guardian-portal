/**
 * Application entry point.
 * Bootstraps React, wraps the app in ClerkProvider for authentication,
 * and removes the static loading overlay (#app-loading from index.html)
 * once React has mounted, so users never get stuck behind the splash.
 */

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import "./index.css";
import "./styles/animations.css";

const PUBLISHABLE_KEY = "pk_test_dG9nZXRoZXItbGFkeWJ1Zy05NC5jbGVyay5hY2NvdW50cy5kZXYk";

/**
 * Idempotent removal of the static splash overlay defined in index.html.
 * Safe to call multiple times.
 */
const removeAppLoader = () => {
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  loader.style.transition = 'opacity 0.3s ease-out';
  loader.style.opacity = '0';
  window.setTimeout(() => {
    loader.parentNode?.removeChild(loader);
  }, 300);
};

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/"
      afterSignOutUrl="/"
    >
      <App />
    </ClerkProvider>
  </BrowserRouter>
);

// Remove the static splash as soon as React has had a chance to paint.
requestAnimationFrame(() => {
  requestAnimationFrame(removeAppLoader);
});

// Hard safety net: never let the splash linger more than 8s.
window.setTimeout(removeAppLoader, 8000);
