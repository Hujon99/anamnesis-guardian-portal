/**
 * Store Selection Page
 * First step in the patient form flow after consent.
 * Allows users to select which store they want to visit for their examination.
 * Shows available examination types for each store to help users make informed decisions.
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { useFormsByStore } from '@/hooks/useFormsByStore';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preserveCustomerParams } from '@/utils/consentUtils';

interface StoreCardProps {
  store: any;
  onSelect: (storeId: string) => void;
  isLoading: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect, isLoading }) => {
  const { data: forms = [] } = useFormsByStore(store.id);

  const examinationTypes = forms
    .map(form => form.examination_type)
    .filter((type, index, array) => type && array.indexOf(type) === index);

  return (
    <Card className="p-6 hover:shadow-elegant transition-all duration-300 group cursor-pointer border-border/60 hover:border-primary/30">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {store.name}
          </h3>
          {store.address && (
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{store.address}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {store.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{store.phone}</span>
            </div>
          )}
          {store.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="text-sm">{store.email}</span>
            </div>
          )}
        </div>

        {examinationTypes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tillgängliga undersökningar:</p>
            <div className="flex flex-wrap gap-2">
              {examinationTypes.map((type, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={() => onSelect(store.id)}
          disabled={isLoading}
          className="w-full mt-4 group-hover:bg-primary/90 transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Väljer butik...
            </>
          ) : (
            <>
              Välj denna butik
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

const StoreSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);

  const orgId = searchParams.get('org_id');
  const formId = searchParams.get('form_id');

  const { stores, isLoading: isLoadingStores, error } = useStores();
  
  // Prefetch forms for all stores as soon as they load
  useEffect(() => {
    if (stores && stores.length > 0) {
      console.log("[StoreSelectionPage]: Prefetching forms for all stores");
      stores.forEach(store => {
        if (store.id) {
          // Prefetch forms for each store
          queryClient.prefetchQuery({
            queryKey: ["forms-by-store", store.id],
            queryFn: async () => {
              const { data, error } = await supabase.functions.invoke('get-store-forms', {
                body: { storeId: store.id }
              });
              
              if (error) throw error;
              return data || [];
            },
            staleTime: 2 * 60 * 1000,
          });
        }
      });
    }
  }, [stores, queryClient]);

  const handleStoreSelect = async (storeId: string) => {
    setIsNavigating(true);
    setSelectedStore(storeId);

    try {
      // Preserve all customer data params (including consent) through the flow
      const params = new URLSearchParams();
      preserveCustomerParams(searchParams, params);
      params.set('store_id', storeId);
      
      // Get store name for display purposes
      const selectedStore = stores?.find(s => s.id === storeId);
      if (selectedStore?.name) {
        params.set('store_name', selectedStore.name);
      }

      navigate(`/examination-type-selection?${params.toString()}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(false);
      setSelectedStore(null);
    }
  };

  if (isLoadingStores) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60 p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Laddar butiker...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4 bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-xl">⚠️</div>
            <h2 className="text-xl font-semibold text-foreground">Ett fel uppstod</h2>
            <p className="text-muted-foreground">
              Kunde inte ladda butiksinformation. Vänligen försök igen senare.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Försök igen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const activeStores = stores?.filter(store => store.id) || [];

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-4">Välj butik</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Välj den butik där du vill genomföra din undersökning. 
            Varje butik kan erbjuda olika typer av undersökningar.
          </p>
        </div>

        {activeStores.length === 0 ? (
          <Card className="p-8 max-w-md w-full mx-auto">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground text-xl">🏪</div>
              <h2 className="text-xl font-semibold text-foreground">Inga butiker tillgängliga</h2>
              <p className="text-muted-foreground">
                Det finns för närvarande inga aktiva butiker tillgängliga.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onSelect={handleStoreSelect}
                isLoading={isNavigating && selectedStore === store.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSelectionPage;