/**
 * This page allows customers to select their examination type when accessing forms via organization links.
 * It displays available examination types based on the organization's forms and redirects to the customer info page
 * with the selected examination type and form ID.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, Contact, Car, FileText } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examinationTypes, setExaminationTypes] = useState<ExaminationType[]>([]);

  const orgId = searchParams.get("org_id");
  const preservedParams = {
    booking_id: searchParams.get("booking_id"),
    first_name: searchParams.get("first_name"),
    store_id: searchParams.get("store_id"),
    store_name: searchParams.get("store_name"),
    booking_date: searchParams.get("booking_date"),
  };

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

      try {
        // Fetch all forms for this organization
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

        // Map forms to examination types
        const types: ExaminationType[] = forms.map(form => ({
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
    };

    fetchExaminationTypes();
  }, [orgId]);

  const handleExaminationTypeSelect = (examinationType: ExaminationType) => {
    // Build URL with all preserved parameters plus the selected form ID and examination type
    const params = new URLSearchParams();
    
    // Add form_id and examination_type
    params.set("form_id", examinationType.formId);
    params.set("examination_type", examinationType.type);
    
    // Add preserved parameters EXCEPT booking_date (customer should choose their own date)
    Object.entries(preservedParams).forEach(([key, value]) => {
      if (value && key !== 'booking_date') {
        params.set(key, value);
      }
    });

    // Navigate to customer info page
    navigate(`/customer-info?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Hämtar undersökningstyper...</p>
            <p className="text-sm text-muted-foreground text-center">
              Vi förbereder dina valmöjligheter
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Ett fel uppstod</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
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
    <div className="min-h-screen bg-surface-light">
      <div className="container max-w-4xl mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Välj typ av undersökning
          </h1>
          <p className="text-lg text-muted-foreground">
            Välj den typ av undersökning som passar ditt behov
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {examinationTypes.map((type) => (
            <Card 
              key={type.formId} 
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
              onClick={() => handleExaminationTypeSelect(type)}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    {type.icon}
                  </div>
                </div>
                <CardTitle className="text-xl">{type.type}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
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
            <Card className="inline-block px-6 py-3 bg-accent/10">
              <p className="text-sm text-muted-foreground">
                Bokning för: <span className="font-medium">{preservedParams.first_name}</span>
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