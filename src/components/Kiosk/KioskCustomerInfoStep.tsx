/**
 * KioskCustomerInfoStep - Touch-friendly customer information collection for kiosk mode.
 * Collects personal number and name before starting the form.
 * Features large inputs optimized for touch interaction on tablets.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, IdCard, ChevronRight } from "lucide-react";

interface KioskCustomerInfoStepProps {
  onComplete: (data: { personalNumber: string; fullName: string }) => void;
}

export const KioskCustomerInfoStep = ({ onComplete }: KioskCustomerInfoStepProps) => {
  const [personalNumber, setPersonalNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ personalNumber?: string; fullName?: string }>({});

  const validatePersonalNumber = (value: string): boolean => {
    // Remove any spaces or dashes
    const cleaned = value.replace(/[\s-]/g, "");
    
    // Check if it's 10 or 12 digits
    if (!/^\d{10}$|^\d{12}$/.test(cleaned)) {
      setErrors(prev => ({ 
        ...prev, 
        personalNumber: "Personnummer måste vara 10 eller 12 siffror" 
      }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, personalNumber: undefined }));
    return true;
  };

  const validateFullName = (value: string): boolean => {
    if (value.trim().length < 2) {
      setErrors(prev => ({ 
        ...prev, 
        fullName: "Ange ditt fullständiga namn" 
      }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, fullName: undefined }));
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPersonalNumberValid = validatePersonalNumber(personalNumber);
    const isNameValid = validateFullName(fullName);
    
    if (isPersonalNumberValid && isNameValid) {
      onComplete({
        personalNumber: personalNumber.replace(/[\s-]/g, ""),
        fullName: fullName.trim()
      });
    }
  };

  return (
    <div className="kiosk-container">
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="w-full max-w-3xl shadow-2xl border-2">
          <CardHeader className="space-y-4 pb-8">
            <CardTitle className="text-4xl font-bold text-center flex items-center justify-center gap-4">
              <User className="h-10 w-10" />
              Välkommen
            </CardTitle>
            <CardDescription className="text-2xl text-center">
              Vänligen ange dina uppgifter för att börja
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Number Field */}
              <div className="space-y-3">
                <Label htmlFor="personalNumber" className="text-2xl font-semibold flex items-center gap-3">
                  <IdCard className="h-6 w-6" />
                  Personnummer *
                </Label>
                <Input
                  id="personalNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="ÅÅÅÅMMDDXXXX"
                  value={personalNumber}
                  onChange={(e) => {
                    setPersonalNumber(e.target.value);
                    if (errors.personalNumber) {
                      setErrors(prev => ({ ...prev, personalNumber: undefined }));
                    }
                  }}
                  onBlur={() => personalNumber && validatePersonalNumber(personalNumber)}
                  className="kiosk-input text-3xl h-20 text-center tracking-wider"
                  required
                  autoFocus
                />
                {errors.personalNumber && (
                  <p className="text-destructive text-xl mt-2">{errors.personalNumber}</p>
                )}
                <p className="text-muted-foreground text-lg">
                  Ange 10 eller 12 siffror (ÅÅÅÅMMDDXXXX)
                </p>
              </div>

              {/* Full Name Field */}
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-2xl font-semibold flex items-center gap-3">
                  <User className="h-6 w-6" />
                  Fullständigt namn *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Förnamn Efternamn"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) {
                      setErrors(prev => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  onBlur={() => fullName && validateFullName(fullName)}
                  className="kiosk-input text-3xl h-20 text-center"
                  required
                />
                {errors.fullName && (
                  <p className="text-destructive text-xl mt-2">{errors.fullName}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="kiosk-button w-full h-20 text-3xl font-bold"
                  disabled={!personalNumber || !fullName}
                >
                  Fortsätt till formulär
                  <ChevronRight className="ml-3 h-8 w-8" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
