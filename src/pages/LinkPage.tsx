
/**
 * This page handles magic links for anamnes forms. It parses URL parameters, validates them,
 * and creates a new entry in the database with the booking information.
 * After successful entry creation, it redirects the user to the form.
 * It ensures that the form is tied to the correct organization.
 * If only form_id is provided, it redirects to CustomerInfoPage for data collection.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarIcon, MapPinIcon, UserIcon, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";

const LinkPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State for page
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [validFormId, setValidFormId] = useState<boolean>(false);
  
  // Extract params from URL
  const bookingId = searchParams.get("booking_id");
  const firstName = searchParams.get("first_name");
  const storeId = searchParams.get("store_id");
  const storeName = searchParams.get("store_name"); // Add explicit store_name parameter
  const bookingDate = searchParams.get("booking_date");
  const formId = searchParams.get("form_id"); // Form ID is required
  
  // Validate the form ID exists in the database
  useEffect(() => {
    const validateFormId = async () => {
      if (!formId) {
        setError("Formulär-ID saknas i URL:en");
        setIsLoading(false);
        return;
      }
      
      try {
        // Check that the form exists
        const { data, error } = await supabase
          .from('anamnes_forms')
          .select('id')
          .eq('id', formId)
          .maybeSingle();
        
        if (error) {
          console.error("Error validating form ID:", error);
          setError(`Ett fel uppstod vid validering av formuläret: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        if (!data) {
          setError("Det angivna formuläret finns inte");
          setIsLoading(false);
          return;
        }
        
        setValidFormId(true);
        
        // If only form_id is provided (no booking_id), redirect to customer info page
        if (!bookingId) {
          console.log("Only form_id provided, redirecting to customer info page");
          navigate(`/customer-info?form_id=${formId}`);
          return;
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error in form validation:", err);
        setError("Ett oväntat fel uppstod vid validering av formuläret");
        setIsLoading(false);
      }
    };
    
    if (formId) {
      validateFormId();
    } else {
      setError("Formulär-ID saknas i URL:en");
      setIsLoading(false);
    }
  }, [bookingId, formId, navigate]);
  
  const handleGenerateForm = async () => {
    try {
      setIsProcessing(true);
      
      // Call the edge function to generate the token
      const { data, error } = await supabase.functions.invoke('issue-form-token', {
        body: {
          bookingId,
          firstName,
          storeId,
          storeName, // Pass both storeId and storeName to the edge function
          bookingDate,
          formId
        }
      });
      
      if (error) {
        console.error("Error generating form:", error);
        setError(`Ett fel uppstod: ${error.message}`);
        setIsProcessing(false);
        return;
      }
      
      // Store the token and redirect
      setAccessToken(data.accessToken);
      setTimeout(() => {
        navigate(`/patient-form?token=${data.accessToken}`);
      }, 1500);
      
    } catch (err: any) {
      console.error("Error in handleGenerateForm:", err);
      setError(`Ett oväntat fel uppstod: ${err.message || "Okänt fel"}`);
      setIsProcessing(false);
    }
  };
  
  // Format booking date if available
  const formattedDate = bookingDate ? formatDate(bookingDate) : null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Förbereder ditt formulär...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Ett fel uppstod
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Tillbaka till startsidan
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="mr-2 h-5 w-5" />
              Ditt formulär är klart!
            </CardTitle>
            <CardDescription>Du kommer nu att omdirigeras till formuläret.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Omdirigerar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Display store information based on what's available
  const storeDisplay = storeName || storeId || null;
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Hälsoformulär inför synundersökning</CardTitle>
          <CardDescription>
            Vänligen fyll i ett kort hälsoformulär inför din bokade synundersökning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookingId && (
            <div className="flex items-start space-x-2 text-sm">
              <div>
                <p className="font-medium">Boknings-ID:</p>
                <p className="text-muted-foreground">{bookingId}</p>
              </div>
            </div>
          )}
          
          {firstName && (
            <div className="flex items-start space-x-2 text-sm">
              <UserIcon className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Förnamn:</p>
                <p className="text-muted-foreground">{firstName}</p>
              </div>
            </div>
          )}
          
          {formattedDate && (
            <div className="flex items-start space-x-2 text-sm">
              <CalendarIcon className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Bokningsdatum:</p>
                <p className="text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
          )}
          
          {storeDisplay && (
            <div className="flex items-start space-x-2 text-sm">
              <MapPinIcon className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Butik:</p>
                <p className="text-muted-foreground">{storeDisplay}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerateForm} 
            disabled={isProcessing || !validFormId}
            className="w-full"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? "Skapar formulär..." : "Fortsätt till formulär"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LinkPage;
