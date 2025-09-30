/**
 * Custom hook for managing organization AI prompts
 * Handles fetching and updating custom AI prompts for different examination types
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrganizationPrompts {
  ai_prompt_general: string | null;
  ai_prompt_driving_license: string | null;
  ai_prompt_lens_examination: string | null;
}

// Base instructions used by all examination types
const BASE_INSTRUCTIONS = `Du är en AI-assistent specialiserad på att hjälpa optiker. Din roll är att agera som en erfaren klinisk assistent som tolkar och sammanfattar patienters anamnesdata.

Du kommer att få indata i form av en textlista som innehåller frågor ställda till en patient och patientens svar på dessa frågor, extraherade från ett anamnesformulär.

Baserat endast på den information som finns i denna textlista, ska du generera en välstrukturerad, koncis och professionell anamnessammanfattning på svenska.

Använd ett objektivt och kliniskt språk med korrekta facktermer där det är relevant.

Viktiga instruktioner:
  1. Inkludera endast information som uttryckligen finns i den angivna fråge- och svarslistan. Gör inga egna antaganden, tolkningar eller tillägg.
  2. Var koncis och fokusera på det kliniskt relevanta.
  3. Tänk på att om något INTE står i anamnesen tolkas det som att man INTE har frågat om det.
  4. Använd tydliga rubriker (utan emojis) för enkel läsbarhet.
  5. Formattera EJ som markdown, utan tänk txt.`;

export const DEFAULT_PROMPTS = {
  general: `${BASE_INSTRUCTIONS}

Strukturera sammanfattningen under följande rubriker (anpassa efter den information som finns tillgänglig):
  - Anledning till besök: (Varför patienten söker vård)
  - Aktuella symtom/besvär: (Synproblem, huvudvärk, dubbelseende, torra ögon etc.)
  - Tidigare ögonhistorik: (Användning av glasögon/linser, tidigare undersökningar, operationer, kända ögonsjukdomar)
  - Ärftlighet: (Ögonsjukdomar i släkten)
  - Allmänhälsa/Medicinering: (Relevanta sjukdomar, mediciner, allergier)
  - Socialt/Livsstil: (Yrke, skärmtid, fritidsintressen om relevant)`,
  
  driving_license: `${BASE_INSTRUCTIONS}

KÖRKORTSUNDERSÖKNING - SPECIALINSTRUKTIONER:
Detta är en körkortsundersökning. Använd kortformat:

OM allt är NORMALT (Nej på alla frågor):
- Skriv: "Allt är normalt och licens kan ges för körkortstillstånd grupp I (A, AM, B, BE)." eller motsvarande baserat på önskad körkortskategori.
- Använd INTE några rubriker.
- Håll det MYCKET kort.

OM något är AVVIKANDE (Ja-svar med förklarande text):
- Inkludera fråga och svar för avvikande fynd.
- Avsluta med att resten var normalt.
- Använd INTE rubriker för körkortsundersökningar.
- Håll det kort och fokuserat.`,
  
  lens_examination: `${BASE_INSTRUCTIONS}

LINSUNDERSÖKNING - Fokusera på följande områden:
  - Anledning till besök: (Nya linser, problem med nuvarande linser, intresse för linser)
  - Aktuella besvär: (Irritation, torrhet, diskomfort, synproblem med linser)
  - Linshistorik: (Tidigare linsanvändning, typ av linser, daglig/månads/årslins)
  - Ögonhälsa: (Torra ögon, allergier, infektioner relaterade till linsanvändning)
  - Livsstil: (Aktiviteter, arbetstid, skärmtid som påverkar linsanvändning)`
};

export function useOrganizationPrompts(organizationId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['organization-prompts', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      // First, fetch system defaults from the system organization
      const { data: systemData, error: systemError } = await supabase
        .from('organization_settings')
        .select('ai_prompt_general, ai_prompt_driving_license, ai_prompt_lens_examination')
        .eq('organization_id', 'system')
        .eq('is_global_default', true)
        .maybeSingle();

      // Use system defaults if available, otherwise use hardcoded defaults
      const systemPrompts = systemData ? {
        general: systemData.ai_prompt_general || DEFAULT_PROMPTS.general,
        driving_license: systemData.ai_prompt_driving_license || DEFAULT_PROMPTS.driving_license,
        lens_examination: systemData.ai_prompt_lens_examination || DEFAULT_PROMPTS.lens_examination
      } : DEFAULT_PROMPTS;

      // Try to fetch organization-specific prompts
      const { data, error } = await supabase
        .from('organization_settings')
        .select('ai_prompt_general, ai_prompt_driving_license, ai_prompt_lens_examination')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      // If no organization-specific settings, return system defaults
      if (!data) {
        return {
          ai_prompt_general: systemPrompts.general,
          ai_prompt_driving_license: systemPrompts.driving_license,
          ai_prompt_lens_examination: systemPrompts.lens_examination
        };
      }

      // Return org prompts with fallback to system defaults
      return {
        ai_prompt_general: data.ai_prompt_general || systemPrompts.general,
        ai_prompt_driving_license: data.ai_prompt_driving_license || systemPrompts.driving_license,
        ai_prompt_lens_examination: data.ai_prompt_lens_examination || systemPrompts.lens_examination
      };
    },
    enabled: !!organizationId
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<OrganizationPrompts>) => {
      if (!organizationId) throw new Error('Organization ID required');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('organization_settings')
        .select('organization_id')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!existing) {
        // Insert new settings
        const { error } = await supabase
          .from('organization_settings')
          .insert({
            organization_id: organizationId,
            ...updates
          });

        if (error) throw error;
      } else {
        // Update existing settings
        const { error } = await supabase
          .from('organization_settings')
          .update(updates)
          .eq('organization_id', organizationId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-prompts', organizationId] });
      toast({
        title: 'Promptar uppdaterade',
        description: 'AI-promptarna har sparats'
      });
    },
    onError: (error) => {
      console.error('Error updating prompts:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte spara promptarna',
        variant: 'destructive'
      });
    }
  });

  return {
    prompts,
    isLoading,
    updatePrompts: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
}
