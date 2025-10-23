-- Add kiosk mode columns to anamnes_entries table
ALTER TABLE public.anamnes_entries 
ADD COLUMN IF NOT EXISTS is_kiosk_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_supervisor_code BOOLEAN DEFAULT false;

-- Add index for kiosk mode filtering
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_kiosk_mode 
ON public.anamnes_entries(is_kiosk_mode) 
WHERE is_kiosk_mode = true;

-- Add comments
COMMENT ON COLUMN public.anamnes_entries.is_kiosk_mode IS 'Indicates if this entry was created for kiosk mode with extended expiry (24h) and fullscreen UI';
COMMENT ON COLUMN public.anamnes_entries.require_supervisor_code IS 'If true, requires supervisor PIN code validation before form submission in kiosk mode';