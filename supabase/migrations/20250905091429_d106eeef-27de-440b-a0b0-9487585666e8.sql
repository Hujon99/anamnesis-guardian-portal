-- Drop the existing status check constraint
ALTER TABLE anamnes_entries DROP CONSTRAINT IF EXISTS anamnes_entries_status_check;

-- Add new constraint that includes 'pending_id_verification' status
ALTER TABLE anamnes_entries ADD CONSTRAINT anamnes_entries_status_check 
CHECK (status = ANY (ARRAY['sent'::text, 'pending'::text, 'ready'::text, 'reviewed'::text, 'journaled'::text, 'pending_id_verification'::text]));