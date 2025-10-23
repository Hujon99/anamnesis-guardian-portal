
/**
 * This is the main application component that sets up routing, authentication,
 * and global contexts. It defines all available routes and their corresponding
 * components, ensuring proper authentication protection where needed.
 */

import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import Dashboard from "@/pages/Dashboard";
import MyAnamnesisPage from "@/pages/MyAnamnesisPage";
import OpticianView from "@/pages/OpticianView";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";
import PatientFormPage from "@/pages/PatientFormPage";
import OpticianFormPage from "@/pages/OpticianFormPage";
import KioskFormPage from "@/pages/KioskFormPage";
import LinkPage from "@/pages/LinkPage";
import ConsentPage from "@/pages/ConsentPage";
import StoreSelectionPage from "@/pages/StoreSelectionPage";
import CustomerInfoPage from "@/pages/CustomerInfoPage";
import ExaminationTypeSelectionPage from "@/pages/ExaminationTypeSelectionPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import { AnamnesisProvider } from "@/contexts/AnamnesisContext";
import { UserSyncManager } from "./components/UserSyncManager";
import { SystemAdminProvider } from "@/contexts/SystemAdminContext";

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            
            {/* Form pages - accessed via token, no auth required */}
            <Route path="/patient-form" element={<PatientFormPage />} />
            <Route path="/optician-form" element={<OpticianFormPage />} /> {/* Moved outside ProtectedRoute */}
            <Route path="/kiosk-form" element={<KioskFormPage />} />
            <Route path="/link" element={<LinkPage />} />
            <Route path="/consent" element={<ConsentPage />} />
            <Route path="/store-selection" element={<StoreSelectionPage />} />
            <Route path="/customer-info" element={<CustomerInfoPage />} />
            <Route path="/examination-type-selection" element={<ExaminationTypeSelectionPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            
            {/* Protected routes that require authentication */}
            <Route 
              element={
                <ProtectedRoute>
                  <SystemAdminProvider>
                    <AnamnesisProvider>
                      {/* UserSyncManager runs here to ensure it's active for all authenticated routes */}
                      <UserSyncManager />
                      <Layout />
                    </AnamnesisProvider>
                  </SystemAdminProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route 
                path="/my-anamneses" 
                element={
                  <MyAnamnesisPage />
                } 
              />
              <Route path="/optician" element={<OpticianView />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
