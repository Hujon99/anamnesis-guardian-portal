
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
import MyAnamnesisPage from "@/pages/MyAnamnesisPage"; // Add the new page
import OpticianView from "@/pages/OpticianView";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";
import PatientFormPage from "@/pages/PatientFormPage";
import OpticianFormPage from "@/pages/OpticianFormPage";
import LinkPage from "@/pages/LinkPage";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";

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
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          
          {/* Form page - accessed via token, no auth required */}
          <Route path="/patient-form" element={<PatientFormPage />} />
          <Route path="/link" element={<LinkPage />} />
          
          {/* Protected routes that require authentication */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-anamneses" element={<MyAnamnesisPage />} /> {/* New route */}
            <Route path="/optician" element={<OpticianView />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/optician-form" element={<OpticianFormPage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
