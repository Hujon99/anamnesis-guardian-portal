-- Add new status for entries awaiting ID verification
-- First, let's see if we have an enum for status or if it's just text
-- Looking at the anamnes_entries table, status is text, so we can just use the new value

-- Add a comment to document the new status values
COMMENT ON COLUMN anamnes_entries.status IS 'Entry status: sent, pending, ready, journaled, pending_id_verification';