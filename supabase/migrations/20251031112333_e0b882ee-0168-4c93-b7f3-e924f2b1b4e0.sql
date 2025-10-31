-- Add index for fast CISS form lookup by organization and examination type
-- This optimizes the generate-ciss-token edge function
CREATE INDEX IF NOT EXISTS idx_forms_org_examination_type 
ON public.anamnes_forms(organization_id, examination_type) 
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON INDEX idx_forms_org_examination_type IS 'Optimizes lookup of active forms by organization and examination type (used by CISS token generation)';
