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

export const DEFAULT_PROMPTS = {
  general: 'Du är en klinisk assistent som sammanfattar patientanamnes. Skapa en tydlig, koncis sammanfattning som ska användas av optiker. Fokusera på kliniskt relevanta detaljer och organisera informationen logiskt.',
  driving_license: `Du är en klinisk assistent som sammanfattar körkortsundersökningar. Fokusera särskilt på:
- Synschärpa och seende
- Eventuella begränsningar eller varningar
- Rekommendationer för körkort
- Glasögon/linsanvändning
Håll sammanfattningen kortfattad och kliniskt relevant.`,
  lens_examination: `Du är en klinisk assistent som sammanfattar linsundersökningar. Fokusera på:
- Patientens behov och önskemål
- Tidigare linserfarenhet
- Relevanta hälsoaspekter
- Rekommendationer
Skapa en användbar sammanfattning för linsanpassning.`
};

export function useOrganizationPrompts(organizationId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['organization-prompts', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('organization_settings')
        .select('ai_prompt_general, ai_prompt_driving_license, ai_prompt_lens_examination')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist
      if (!data) {
        return {
          ai_prompt_general: DEFAULT_PROMPTS.general,
          ai_prompt_driving_license: DEFAULT_PROMPTS.driving_license,
          ai_prompt_lens_examination: DEFAULT_PROMPTS.lens_examination
        };
      }

      return {
        ai_prompt_general: data.ai_prompt_general || DEFAULT_PROMPTS.general,
        ai_prompt_driving_license: data.ai_prompt_driving_license || DEFAULT_PROMPTS.driving_license,
        ai_prompt_lens_examination: data.ai_prompt_lens_examination || DEFAULT_PROMPTS.lens_examination
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
