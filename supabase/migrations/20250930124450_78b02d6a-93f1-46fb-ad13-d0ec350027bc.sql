-- Add AI prompt configuration columns to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS ai_prompt_general TEXT DEFAULT 'Du är en klinisk assistent som sammanfattar patientanamnes. Skapa en tydlig, koncis sammanfattning som ska användas av optiker. Fokusera på kliniskt relevanta detaljer och organisera informationen logiskt.',
ADD COLUMN IF NOT EXISTS ai_prompt_driving_license TEXT DEFAULT 'Du är en klinisk assistent som sammanfattar körkortsundersökningar. Fokusera särskilt på:
- Synschärpa och seende
- Eventuella begränsningar eller varningar
- Rekommendationer för körkort
- Glasögon/linsanvändning
Håll sammanfattningen kortfattad och kliniskt relevant.',
ADD COLUMN IF NOT EXISTS ai_prompt_lens_examination TEXT DEFAULT 'Du är en klinisk assistent som sammanfattar linsundersökningar. Fokusera på:
- Patientens behov och önskemål
- Tidigare linserfarenhet
- Relevanta hälsoaspekter
- Rekommendationer
Skapa en användbar sammanfattning för linsanpassning.';

-- Add comment
COMMENT ON COLUMN public.organization_settings.ai_prompt_general IS 'Custom AI prompt for general examinations';
COMMENT ON COLUMN public.organization_settings.ai_prompt_driving_license IS 'Custom AI prompt for driving license examinations';
COMMENT ON COLUMN public.organization_settings.ai_prompt_lens_examination IS 'Custom AI prompt for lens examinations';