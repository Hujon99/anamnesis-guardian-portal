/**
 * Kiosk Form Page - Full-screen form interface optimized for kiosk display.
 * Features: Large touch-friendly UI, optional supervisor PIN, auto-submit & reload.
 * Designed for self-service patient form filling in clinic waiting areas.
 * Uses custom kiosk.css for enlarged UI elements and simplified navigation.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BaseFormPage } from "@/components/Forms/BaseFormPage";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Maximize2, Minimize2, Home, AlertTriangle } from "lucide-react";
import { KioskCustomerInfoStep } from "@/components/Kiosk/KioskCustomerInfoStep";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const SUPERVISOR_PIN = "1234"; // In production, fetch from organization settings

const KioskFormPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const requireCode = searchParams.get("code") === "required";
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [customerData, setCustomerData] = useState<{
    personalNumber: string;
    fullName: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Log token for debugging
  useEffect(() => {
    if (token) {
      console.log("KioskFormPage: Rendering with token", token.substring(0, 6) + "...");
    } else {
      console.log("KioskFormPage: No token in URL");
      toast.error("Ingen åtkomsttoken hittades");
    }
  }, [token]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle successful form submission
  const handleFormSubmit = () => {
    console.log("KioskFormPage: Form submitted successfully");
    
    if (requireCode) {
      // Show PIN dialog before auto-reload
      setShowPinDialog(true);
    } else {
      // Auto-redirect back to welcome page
      startCountdown();
    }
  };

  // Start countdown and redirect back to welcome page
  const startCountdown = () => {
    setIsSubmitted(true);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Redirect back to kiosk welcome page for next patient
          const sessionToken = localStorage.getItem('kiosk_session_token');
          if (sessionToken) {
            window.location.href = `/kiosk?session=${sessionToken}`;
          } else {
            // Fallback: reload if no session token (shouldn't happen in normal flow)
            window.location.reload();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle customer info completion
  const handleCustomerInfoComplete = (data: { personalNumber: string; fullName: string }) => {
    console.log("KioskFormPage: Customer info collected", {
      personalNumber: data.personalNumber.substring(0, 6) + "****",
      fullName: data.fullName
    });
    setCustomerData(data);
    setShowCustomerInfo(false);
  };

  // Validate supervisor PIN
  const validatePin = () => {
    if (pinInput === SUPERVISOR_PIN) {
      setPinError("");
      setShowPinDialog(false);
      toast.success("PIN verifierad", {
        description: "Formulär godkänt av handledare"
      });
      startCountdown();
    } else {
      setPinError("Felaktig PIN-kod");
      setPinInput("");
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Reset to kiosk welcome page
  const handleResetToStart = () => {
    const sessionToken = localStorage.getItem('kiosk_session_token');
    if (sessionToken) {
      window.location.href = `/kiosk?session=${sessionToken}`;
    } else {
      toast({
        title: "Fel",
        description: "Ingen session hittades",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="kiosk-container">
      {/* Floating action buttons */}
      {!showCustomerInfo && !isSubmitted && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex gap-1.5 sm:gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg"
            title={isFullscreen ? "Avsluta fullskärm" : "Fullskärm"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowResetDialog(true)}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg"
            title="Tillbaka till start"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      )}

      {/* Show customer info step first */}
      {showCustomerInfo ? (
        <KioskCustomerInfoStep onComplete={handleCustomerInfoComplete} />
      ) : (
        <>
          <div className="kiosk-header">
            <h1 className="kiosk-title">Patientformulär</h1>
            <p className="kiosk-subtitle">Fyll i formuläret nedan</p>
          </div>

          {isSubmitted ? (
        <div className="kiosk-success">
          <div className="kiosk-success-icon">✓</div>
          <h2 className="kiosk-success-title">Tack för ditt svar!</h2>
          <p className="kiosk-success-message">
            Återgår till startsidan om {countdown} sekunder...
          </p>
          <button 
            onClick={() => {
              const sessionToken = localStorage.getItem('kiosk_session_token');
              if (sessionToken) {
                window.location.href = `/kiosk?session=${sessionToken}`;
              }
            }}
            className="kiosk-button mt-6"
          >
            Återgå nu
          </button>
        </div>
          ) : (
            <BaseFormPage 
              token={token}
              mode="patient"
              showBookingInfo={false}
              onSubmitSuccess={handleFormSubmit}
              useTouchFriendly={true}
              kioskCustomerData={customerData}
            />
          )}
        </>
      )}

      {/* Supervisor PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="kiosk-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6" />
              Handledare-verifiering
            </DialogTitle>
            <DialogDescription className="text-lg">
              Ange handledarkod för att godkänna inskickat formulär
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="pin" className="text-lg">PIN-kod</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validatePin();
                }}
                className="kiosk-input text-center text-2xl tracking-widest"
                placeholder="••••"
                autoFocus
              />
              {pinError && (
                <p className="text-destructive text-sm mt-2">{pinError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput("");
                  setPinError("");
                }}
                className="flex-1 text-lg h-14"
              >
                Avbryt
              </Button>
              <Button
                size="lg"
                onClick={validatePin}
                className="flex-1 text-lg h-14"
              >
                Verifiera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="kiosk-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Avbryt och börja om?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              Är du säker på att du vill avbryta det pågående formuläret och återgå till startsidan? 
              All ifylld information kommer att förloras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-lg h-14">
              Fortsätt fylla i
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToStart}
              className="text-lg h-14 bg-destructive hover:bg-destructive/90"
            >
              Ja, börja om
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KioskFormPage;
