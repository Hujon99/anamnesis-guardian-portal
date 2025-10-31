
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import "./index.css";
import "./styles/animations.css";

const PUBLISHABLE_KEY = "pk_test_dG9nZXRoZXItbGFkeWJ1Zy05NC5jbGVyay5hY2NvdW50cy5kZXYk";

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      clerkJSVersion="5.56.0-snapshot.v20250312225817"
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
