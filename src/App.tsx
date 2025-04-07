
/**
 * Main application component that handles routing and authentication.
 * It sets up the application structure including authenticated and public routes.
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

// Pages
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import OpticianView from "./pages/OpticianView";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PatientFormPage from "./pages/PatientFormPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        {/* Public routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        
        {/* Public patient form route - accessible without authentication */}
        <Route path="/patient-form" element={<PatientFormPage />} />
        {/* Backward compatibility for old links */}
        <Route path="/fylli" element={<Navigate to="/patient-form" replace />} />

        {/* Home route with authentication check */}
        <Route 
          path="/" 
          element={
            <>
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
              <SignedOut>
                <HomePage />
              </SignedOut>
            </>
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <SignedIn>
              <Layout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Layout>
            </SignedIn>
          }
        />
        
        {/* Anamnes List Route (formerly Optician View) */}
        <Route 
          path="/anamnes" 
          element={
            <SignedIn>
              <Layout>
                <ProtectedRoute requireRole={["org:admin", "org:member"]}>
                  <OpticianView />
                </ProtectedRoute>
              </Layout>
            </SignedIn>
          }
        />
        
        <Route 
          path="/admin" 
          element={
            <SignedIn>
              <Layout>
                <ProtectedRoute requireRole="org:admin">
                  <AdminPanel />
                </ProtectedRoute>
              </Layout>
            </SignedIn>
          }
        />

        {/* Redirect path for backward compatibility */}
        <Route
          path="/optician"
          element={<Navigate to="/anamnes" replace />}
        />

        {/* Catch unauthorized access to protected routes */}
        <Route
          path="/dashboard/*"
          element={
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          }
        />
        
        <Route
          path="/anamnes/*"
          element={
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          }
        />
        
        <Route
          path="/admin/*"
          element={
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          }
        />

        {/* Catch-all and Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
