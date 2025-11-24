-- Migration: Hide old 'sent' entries from organizations but keep for system admins
-- Purpose: Keep 'sent' status forms for debugging (120 days) while hiding them from organizations after 2 hours

-- Step 1: Drop the old policy that shows all entries to organization members
DROP POLICY IF EXISTS "Users can view entries from their organization" ON public.anamnes_entries;

-- Step 2: Create new policy that filters 'sent' entries by age for regular organizations
CREATE POLICY "Organization members can view recent or non-sent entries"
ON public.anamnes_entries
FOR SELECT
TO authenticated
USING (
  organization_id = (auth.jwt() ->> 'org_id')
  AND (
    -- Show all entries that are NOT 'sent'
    status != 'sent'
    OR
    -- Or show 'sent' entries that are younger than 2 hours
    (status = 'sent' AND created_at > NOW() - INTERVAL '2 hours')
  )
);

-- Step 3: Add performance index for filtering 'sent' entries by creation time
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_status_created_at 
ON public.anamnes_entries(status, created_at)
WHERE status = 'sent';

-- Note: The existing "System admins can view all entries" policy remains unchanged,
-- ensuring system administrators can see all 'sent' entries regardless of age for debugging purposes.