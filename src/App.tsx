
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
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

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

        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
          } 
        />

        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <SignedIn>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </SignedIn>
            }
          />
          <Route
            path="/admin"
            element={
              <SignedIn>
                <ProtectedRoute requireRole="org:admin">
                  <AdminPanel />
                </ProtectedRoute>
              </SignedIn>
            }
          />
        </Route>

        {/* Catch-all and Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
