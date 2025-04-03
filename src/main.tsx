
/**
 * This is the entry point of the application. It sets up the React application with various providers:
 * - ClerkProvider for authentication (when available)
 * - BrowserRouter for routing
 * 
 * The file also handles graceful error cases when authentication credentials are missing.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'
import './styles/animations.css'

// Get the publishable key from environment variables
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Determine if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development'

// Only throw an error in production; in development, show a warning
if (!CLERK_PUBLISHABLE_KEY && !isDevelopment) {
  throw new Error("Missing Clerk Publishable Key")
}

// Create the root React component
const root = ReactDOM.createRoot(document.getElementById('root')!)

// Render the app with appropriate providers
if (!CLERK_PUBLISHABLE_KEY && isDevelopment) {
  // In development, we can run without Clerk when the key is missing
  console.warn(
    "WARNING: Running without authentication. The Clerk publishable key is missing. " +
    "Set the VITE_CLERK_PUBLISHABLE_KEY environment variable to enable authentication."
  )
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
} else {
  // Normal rendering with Clerk authentication
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  )
}
