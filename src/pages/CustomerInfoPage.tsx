
/**
 * This page collects basic customer information when only a form_id is provided in the URL.
 * It displays a simple form where customers enter their name, select a store, and choose a booking date.
 * After submission, it generates a token and redirects to the patient form.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, AlertCircle, UserIcon, MapPinIcon } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CustomerInfoPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State for page
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Data state
  const [stores, setStores] = useState<Array<{id: string, name: string}>>([]);
  const [formData, setFormData] = useState<{id: string, organization_id: string} | null>(null);
  
  const formId = searchParams.get("form_id");
  
  // Generate random order number
  const generateOrderNumber = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };
  
  // Validate form and fetch data
  useEffect(() => {
    const validateAndFetchData = async () => {
      if (!formId) {
        setError("Formulär-ID saknas i URL:en");
        setIsLoading(false);
        return;
      }
      
      try {
        console.log(`CustomerInfoPage: Validating form_id: ${formId}`);
        
        // Validate form exists and get organization
        const { data: form, error: formError } = await supabase
          .from('anamnes_forms')
          .select('id, organization_id')
          .eq('id', formId)
          .maybeSingle();
        
        if (formError) {
          console.error("Error fetching form:", formError);
          setError(`Ett fel uppstod vid validering av formuläret: ${formError.message}`);
          setIsLoading(false);
          return;
        }
        
        if (!form) {
          console.error("Form not found for id:", formId);
          setError("Det angivna formuläret finns inte");
          setIsLoading(false);
          return;
        }
        
        console.log(`CustomerInfoPage: Form found for organization: ${form.organization_id}`);
        setFormData(form);
        
        // Fetch stores using the new database function
        console.log(`CustomerInfoPage: Fetching stores using get_stores_for_form function`);
        const { data: storesData, error: storesError } = await supabase.rpc('get_stores_for_form', {
          form_id: formId
        });
            
        if (storesError) {
          console.error("Error fetching stores:", storesError);
          setError(`Ett fel uppstod vid hämtning av butiker: ${storesError.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log(`CustomerInfoPage: Found ${storesData?.length || 0} stores`);
        console.log("Stores data:", storesData);
        setStores(storesData || []);
        
        setIsLoading(false);
        
      } catch (err) {
        console.error("Error in validation:", err);
        setError("Ett oväntat fel uppstod vid validering");
        setIsLoading(false);
      }
    };
    
    validateAndFetchData();
  }, [formId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      setError("Vänligen ange ditt namn");
      return;
    }
    
    if (!bookingDate) {
      setError("Vänligen välj ett bokningsdatum");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const orderNumber = generateOrderNumber();
      const selectedStore = stores.find(store => store.id === selectedStoreId);
      
      console.log("CustomerInfoPage: Submitting form with data:", {
        orderNumber,
        firstName: firstName.trim(),
        selectedStoreId,
        selectedStoreName: selectedStore?.name,
        bookingDate: bookingDate.toISOString(),
        formId
      });
      
      // Call the edge function to generate token
      const { data, error } = await supabase.functions.invoke('issue-form-token', {
        body: {
          bookingId: orderNumber,
          firstName: firstName.trim(),
          storeId: selectedStoreId || null,
          storeName: selectedStore?.name || null,
          bookingDate: bookingDate.toISOString(),
          formId: formId
        }
      });
      
      if (error) {
        console.error("Error generating form token:", error);
        setError(`Ett fel uppstod: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      
      console.log("CustomerInfoPage: Token generated successfully, redirecting to patient form");
      
      // Redirect to patient form with token
      navigate(`/patient-form?token=${data.accessToken}`);
      
    } catch (err: any) {
      console.error("Error in handleSubmit:", err);
      setError(`Ett oväntat fel uppstod: ${err.message || "Okänt fel"}`);
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Förbereder formuläret...</p>
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
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Dina uppgifter</CardTitle>
          <CardDescription>
            Vänligen fyll i dina uppgifter för att fortsätta till hälsoformuläret.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                Fullt namn *
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Ange ditt fullständiga namn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            
            {/* Store selection */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <MapPinIcon className="h-4 w-4 mr-2" />
                Butik
              </Label>
              {stores.length > 0 ? (
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj en butik (valfritt)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                  Inga butiker tillgängliga för denna organisation
                </div>
              )}
            </div>
            
            {/* Date picker */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Bokningsdatum *
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bookingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDate ? (
                      format(bookingDate, "PPP", { locale: sv })
                    ) : (
                      <span>Välj bokningsdatum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      setBookingDate(date);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting || !firstName.trim() || !bookingDate}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Skapar formulär..." : "Fortsätt till hälsoformulär"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CustomerInfoPage;
