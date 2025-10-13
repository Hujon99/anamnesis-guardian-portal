/**
 * This page collects basic customer information when only a form_id is provided in the URL.
 * It displays a simple form where customers enter their name, select a store, and choose a booking date.
 * After submission, it generates a token and redirects to the patient form.
 * Updated to pre-fill booking date when provided in URL parameters.
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
  const orgId = searchParams.get("org_id");
  const effectiveOrgId = orgId || formData?.organization_id;
  
  // Read additional URL parameters for pre-filling
  const urlBookingDate = searchParams.get("booking_date");
  const urlStoreId = searchParams.get("store_id");
  const urlStoreName = searchParams.get("store_name");
  const urlFirstName = searchParams.get("first_name");
  const urlBookingId = searchParams.get("booking_id");
  
  // Generate random order number
  const generateOrderNumber = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };
  
  // Pre-fill form fields from URL parameters
  useEffect(() => {
    // Pre-fill first name if provided
    if (urlFirstName && !firstName) {
      setFirstName(urlFirstName);
    }
    
    // Pre-fill store if provided and valid
    if (urlStoreId && stores.length > 0) {
      const storeExists = stores.some(store => store.id === urlStoreId);
      if (storeExists) {
        setSelectedStoreId(urlStoreId);
      }
    }
    
    // Pre-fill booking date if provided
    if (urlBookingDate && !bookingDate) {
      try {
        const parsedDate = new Date(urlBookingDate);
        if (!isNaN(parsedDate.getTime())) {
          setBookingDate(parsedDate);
        }
      } catch (err) {
        console.warn("Could not parse booking date from URL:", urlBookingDate);
      }
    }
  }, [urlFirstName, urlStoreId, urlBookingDate, firstName, stores, bookingDate]);
  
  // Validate and fetch data
  useEffect(() => {
    const validateAndFetchData = async () => {
      // Handle form_id based flow
      if (formId && !orgId) {
        try {
          console.log(`CustomerInfoPage: Fetching form and organization: ${formId}`);
          
          const { data: form, error: formError } = await supabase
            .from('anamnes_forms')
            .select('id, organization_id')
            .eq('id', formId)
            .maybeSingle();
          
          if (formError) {
            console.error("Error fetching form:", formError);
            setError(`Ett fel uppstod vid hämtning av formulär: ${formError.message}`);
            setIsLoading(false);
            return;
          }
          
          if (!form) {
            setError("Det angivna formuläret finns inte");
            setIsLoading(false);
            return;
          }
          
          setFormData(form);
          
          // Fetch stores for the form's organization
          const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('organization_id', form.organization_id);
          
          if (storesError) {
            console.error("Error fetching stores:", storesError);
            setError(`Ett fel uppstod vid hämtning av butiker: ${storesError.message}`);
            setIsLoading(false);
            return;
          }
          
          console.log(`CustomerInfoPage: Found ${storesData?.length || 0} stores`);
          setStores(storesData || []);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error("Error in form validation:", err);
          setError("Ett oväntat fel uppstod vid validering");
          setIsLoading(false);
          return;
        }
      }
      
      // Handle org_id based flow
      if (!orgId) {
        setError("Organisation-ID eller formulär-ID saknas i URL:en");
        setIsLoading(false);
        return;
      }
      
      try {
        console.log(`CustomerInfoPage: Fetching stores for organization: ${orgId}`);
        
        // Fetch stores for the organization
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id, name')
          .eq('organization_id', orgId);
            
        if (storesError) {
          console.error("Error fetching stores:", storesError);
          setError(`Ett fel uppstod vid hämtning av butiker: ${storesError.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log(`CustomerInfoPage: Found ${storesData?.length || 0} stores`);
        setStores(storesData || []);
        
        setIsLoading(false);
        
      } catch (err) {
        console.error("Error in validation:", err);
        setError("Ett oväntat fel uppstod vid validering");
        setIsLoading(false);
      }
    };
    
    validateAndFetchData();
  }, [orgId, formId]);
  
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
      
      // Use existing booking_id if provided from URL, otherwise generate new one
      const orderNumber = urlBookingId || generateOrderNumber();
      const selectedStore = stores.find(store => store.id === selectedStoreId);
      
      console.log("CustomerInfoPage: Navigating to examination type selection with data:", {
        orderNumber,
        firstName: firstName.trim(),
        selectedStoreId,
        selectedStoreName: selectedStore?.name,
        bookingDate: bookingDate.toISOString(),
        orgId
      });
      
      // Build URL parameters for examination type selection
      const params = new URLSearchParams();
      
      // Use orgId if available, otherwise use the one from form data
      if (orgId) {
        params.set("org_id", orgId);
      } else if (effectiveOrgId) {
        params.set("org_id", effectiveOrgId);
      }
      
      // Include form_id if present
      if (formId) {
        params.set("form_id", formId);
      }
      
      params.set("first_name", firstName.trim());
      params.set("booking_date", bookingDate.toISOString());
      params.set("booking_id", orderNumber);
      
      if (selectedStoreId) {
        params.set("store_id", selectedStoreId);
        if (selectedStore?.name) {
          params.set("store_name", selectedStore.name);
        }
      }
      
      // Navigate to examination type selection
      navigate(`/examination-type-selection?${params.toString()}`);
      
    } catch (err: any) {
      console.error("Error in handleSubmit:", err);
      setError(`Ett oväntat fel uppstod: ${err.message || "Okänt fel"}`);
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-primary">
        <Card className="w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-primary">
        <Card className="w-full max-w-lg border-destructive bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
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
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-primary">
      <Card className="w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
        <CardHeader>
          <CardTitle>Dina uppgifter</CardTitle>
          <CardDescription>
            Vänligen fyll i dina uppgifter för att välja undersökning.
            {(urlFirstName || urlBookingDate || urlStoreId) && (
              <span className="block mt-2 text-sm text-accent-1">
                Vissa uppgifter är förifyllda från din bokningslänk.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                Fullt namn *
                {urlFirstName && (
                  <span className="ml-2 text-xs text-accent-1 bg-accent-1/10 px-2 py-1 rounded">
                    Förifyllt
                  </span>
                )}
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
                {urlStoreId && (
                  <span className="ml-2 text-xs text-accent-1 bg-accent-1/10 px-2 py-1 rounded">
                    Förifyllt
                  </span>
                )}
              </Label>
              {stores.length > 0 ? (
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj en butik" />
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
                {urlBookingDate && (
                  <span className="ml-2 text-xs text-accent-1 bg-accent-1/10 px-2 py-1 rounded">
                    Förifyllt
                  </span>
                )}
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
                    className="p-3 pointer-events-auto"
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
              {isSubmitting ? "Fortsätter..." : "Välj undersökning"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CustomerInfoPage;
