-- Add onboarding columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

COMMENT ON COLUMN public.users.onboarding_completed IS 'Indicates if user has completed the onboarding tour';
COMMENT ON COLUMN public.users.onboarding_step IS 'Current step in onboarding tour (for resuming)';