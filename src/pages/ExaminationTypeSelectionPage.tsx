/**
 * This page allows customers to select their examination type when accessing forms via organization links.
 * It displays available examination types based on the selected store's forms (or organization's forms if no store selected)
 * and redirects to the customer info page with the selected examination type and form ID.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Contact, Car, FileText, Store, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useFormsByStore } from "@/hooks/useFormsByStore";
import { useQueryClient } from "@tanstack/react-query";
import { useFormTemplateByFormId } from "@/hooks/useFormTemplateByFormId";

interface ExaminationType {
  type: string;
  formId: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const ExaminationTypeSelectionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examinationTypes, setExaminationTypes] = useState<ExaminationType[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);

  const orgId = searchParams.get("org_id");
  const storeId = searchParams.get("store_id");
  const preservedParams = {
    booking_id: searchParams.get("booking_id"),
    first_name: searchParams.get("first_name"),
    store_id: searchParams.get("store_id"),
    store_name: searchParams.get("store_name"),
    booking_date: searchParams.get("booking_date"),
  };

  // Use the new hook when store is selected
  const { data: storeforms = [], isLoading: isLoadingStoreForms } = useFormsByStore(storeId || undefined);

  const getExaminationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'synundersökning':
        return <Eye className="h-8 w-8" />;
      case 'linsundersökning':
        return <Contact className="h-8 w-8" />;
      case 'körkortsundersökning':
        return <Car className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const getExaminationDescription = (type: string) => {
    switch (type.toLowerCase()) {
      case 'synundersökning':
        return 'Allmän synundersökning för att kontrollera synskärpa och ögonhälsa';
      case 'linsundersökning':
        return 'Specialundersökning för kontaktlinser och linsanpassning';
      case 'körkortsundersökning':
        return 'Syntest enligt Transportstyrelsens krav för körkort';
      default:
        return 'Välj denna typ av undersökning';
    }
  };

  useEffect(() => {
    const fetchExaminationTypes = async () => {
      if (!orgId) {
        setError("Organisation ID saknas i länken");
        setIsLoading(false);
        return;
      }

      // Check if consent has been given for this session
      const sessionConsent = sessionStorage.getItem(`consent_given_${orgId}`);
      if (sessionConsent !== 'true') {
        // Redirect back to consent page if consent not given
        navigate(`/consent?${searchParams.toString()}`);
        return;
      }

      // Fetch store name if store_id is provided
      if (storeId) {
        try {
          const { data: storeData } = await supabase
            .from('stores')
            .select('name')
            .eq('id', storeId)
            .single();
          
          if (storeData) {
            setStoreName(storeData.name);
          }
        } catch (error) {
          console.error("Error fetching store name:", error);
        }
      }

      if (storeId) {
        // If store is selected, we'll use the hook data
        setIsLoading(isLoadingStoreForms);
      } else {
        // Original behavior for organization-wide forms
        try {
          const { data: forms, error: formsError } = await supabase
            .from('anamnes_forms')
            .select('id, title, examination_type')
            .eq('organization_id', orgId);

          if (formsError) {
            console.error("Error fetching forms:", formsError);
            setError("Kunde inte hämta tillgängliga undersökningstyper");
            setIsLoading(false);
            return;
          }

          if (!forms || forms.length === 0) {
            setError("Inga formulär hittades för denna organisation");
            setIsLoading(false);
            return;
          }

          // Filter out CISS forms - they are only for opticians to fill in directly
          const types: ExaminationType[] = forms
            .filter(form => {
              const examType = form.examination_type?.toLowerCase();
              return examType !== 'ciss' && examType !== 'ciss-formulär';
            })
            .map(form => ({
              type: form.examination_type || 'allmän',
              formId: form.id,
              title: form.title,
              icon: getExaminationIcon(form.examination_type || 'allmän'),
              description: getExaminationDescription(form.examination_type || 'allmän'),
            }));

          setExaminationTypes(types);
          setIsLoading(false);
        } catch (err: any) {
          console.error("Error:", err);
          setError("Ett oväntat fel uppstod");
          setIsLoading(false);
        }
      }
    };

    fetchExaminationTypes();
  }, [orgId, storeId, navigate, searchParams]);

  // Update examination types when store forms are loaded
  useEffect(() => {
    console.log("[ExaminationTypeSelectionPage]: Store forms effect:", {
      storeId,
      isLoadingStoreForms,
      storeFormsCount: storeforms.length,
      storeForms: storeforms
    });

    if (storeId && storeforms.length > 0) {
      // Filter out CISS forms - they are only for opticians to fill in directly
      const types: ExaminationType[] = storeforms
        .filter(form => {
          const examType = form.examination_type?.toLowerCase();
          return examType !== 'ciss' && examType !== 'ciss-formulär';
        })
        .map(form => ({
          type: form.examination_type || 'allmän',
          formId: form.id,
          title: form.title,
          icon: getExaminationIcon(form.examination_type || 'allmän'),
          description: getExaminationDescription(form.examination_type || 'allmän'),
        }));

      console.log("[ExaminationTypeSelectionPage]: Setting examination types:", types);
      setExaminationTypes(types);
      setError(null); // Clear any previous errors
      setIsLoading(false);
      
      // Prefetch form templates for all examination types
      console.log("[ExaminationTypeSelectionPage]: Prefetching form templates");
      types.forEach(type => {
        queryClient.prefetchQuery({
          queryKey: ["form-template-by-id", type.formId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('anamnes_forms')
              .select("*")
              .eq('id', type.formId)
              .single();
            
            if (error) throw error;
            return {
              schema: data.schema,
              id: data.id,
              title: data.title,
              organization_id: data.organization_id,
              examination_type: data.examination_type,
            };
          },
          staleTime: 15 * 60 * 1000,
        });
      });
    } else if (storeId && !isLoadingStoreForms && storeforms.length === 0) {
      console.error("[ExaminationTypeSelectionPage]: No forms found for store");
      setError("Inga formulär hittades för denna butik. Kontrollera att butiken har aktiva formulär tilldelade.");
      setIsLoading(false);
    } else if (storeId && isLoadingStoreForms) {
      // Still loading, keep loading state
      setIsLoading(true);
      setError(null); // Clear any previous errors while loading
    }
  }, [storeforms, isLoadingStoreForms, storeId, queryClient]);

  const handleExaminationTypeSelect = async (examinationType: ExaminationType) => {
    try {
      setIsLoading(true);
      
      // Call the edge function to generate token
      const { data, error } = await supabase.functions.invoke('issue-form-token', {
        body: {
          bookingId: preservedParams.booking_id,
          firstName: preservedParams.first_name,
          storeId: preservedParams.store_id || null,
          storeName: preservedParams.store_name || null,
          bookingDate: preservedParams.booking_date,
          formId: examinationType.formId
        }
      });
      
      if (error) {
        console.error("Error generating form token:", error);
        toast({
          title: "Ett fel uppstod",
          description: `Kunde inte skapa formulär: ${error.message}`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("ExaminationTypeSelectionPage: Token generated successfully, prefetching form template");
      
      // Prefetch form template before navigation if formId is returned
      if (data.formId) {
        await queryClient.prefetchQuery({
          queryKey: ["form-template-by-id", data.formId],
          queryFn: async () => {
            const { data: formData, error: formError } = await supabase
              .from('anamnes_forms')
              .select("*")
              .eq('id', data.formId)
              .single();
            
            if (formError) throw formError;
            return {
              schema: formData.schema,
              id: formData.id,
              title: formData.title,
              organization_id: formData.organization_id,
              examination_type: formData.examination_type,
            };
          },
          staleTime: 15 * 60 * 1000,
        });
      }
      
      console.log("ExaminationTypeSelectionPage: Redirecting to patient form");
      
      // Redirect to patient form with token
      navigate(`/patient-form?token=${data.accessToken}`);
      
    } catch (err: any) {
      console.error("Error in handleExaminationTypeSelect:", err);
      toast({
        title: "Ett oväntat fel uppstod",
        description: err.message || "Okänt fel",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleBackToStores = () => {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    Object.entries(preservedParams).forEach(([key, value]) => {
      if (value && key !== 'store_id' && key !== 'store_name') {
        params.set(key, value);
      }
    });
    navigate(`/store-selection?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {storeId ? 'Hämtar tillgängliga undersökningar...' : 'Hämtar undersökningstyper...'}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {storeId ? 'Vi laddar vad som finns tillgängligt i butiken' : 'Vi förbereder dina valmöjligheter'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
          <CardHeader>
            <CardTitle className="text-destructive">Ett fel uppstod</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            {storeId && (
              <Button 
                onClick={handleBackToStores}
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Välj annan butik
              </Button>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="w-full"
            >
              Försök igen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container max-w-4xl mx-auto p-4 pt-8">
        {storeId && storeName && (
          <div className="mb-6">
            <Card className="p-4 bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Vald butik: {storeName}</span>
              </div>
            </Card>
          </div>
        )}

        <div className="text-center mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg/20">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Välj typ av undersökning
          </h1>
          <p className="text-lg text-foreground/80">
            {storeId ? 'Välj bland de undersökningar som finns tillgängliga i butiken' : 'Välj den typ av undersökning som passar ditt behov'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examinationTypes.map((type) => (
            <Card 
              key={type.formId} 
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20 bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60"
              onClick={() => handleExaminationTypeSelect(type)}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    {type.icon}
                  </div>
                </div>
                <CardTitle className="text-xl text-foreground">{type.type}</CardTitle>
                {storeId && (
                  <Badge variant="secondary" className="mt-2">
                    Tillgänglig i butiken
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-foreground/70 mb-4">
                  {type.description}
                </p>
                <Button 
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExaminationTypeSelect(type);
                  }}
                >
                  Välj denna undersökning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {preservedParams.first_name && (
          <div className="mt-8 text-center">
            <Card className="inline-block px-6 py-3 bg-white/90 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
              <p className="text-sm text-foreground/80">
                Bokning för: <span className="font-medium text-foreground">{preservedParams.first_name}</span>
                {preservedParams.booking_date && (
                  <span className="ml-2">
                    • {new Date(preservedParams.booking_date).toLocaleDateString('sv-SE')}
                  </span>
                )}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExaminationTypeSelectionPage;