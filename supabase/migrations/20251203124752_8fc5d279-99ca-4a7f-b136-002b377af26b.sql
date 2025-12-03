-- Add column to track when onboarding was dismissed (closed without completing)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMP WITH TIME ZONE;