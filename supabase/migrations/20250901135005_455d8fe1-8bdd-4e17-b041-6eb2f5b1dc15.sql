-- Update auto-deletion timestamp trigger logic to exclude 'ready'
-- and perform a one-time cleanup so 'ready' entries no longer carry a deletion/redaction timer.

-- 1) Replace trigger function: only set auto_deletion_timestamp when status becomes 'journaled'
--    (and 'reviewed' kept for backward compatibility). Clear it for all other statuses.
CREATE OR REPLACE FUNCTION public.set_auto_deletion_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If status changed to 'journaled', set auto_deletion_timestamp to 48 hours from now
  IF (NEW.status = 'journaled') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '48 hours';
  END IF;

  -- For backward compatibility, also handle 'reviewed' status
  IF (NEW.status = 'reviewed') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '48 hours';
  END IF;

  -- If status changed to something else (including 'ready'), clear the auto_deletion_timestamp
  IF (NEW.status IS NOT NULL) AND (NEW.status NOT IN ('journaled', 'reviewed')) THEN
    NEW.auto_deletion_timestamp := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) One-time cleanup: ensure 'ready' entries do not have an auto_deletion_timestamp
UPDATE public.anamnes_entries
SET auto_deletion_timestamp = NULL
WHERE status = 'ready' AND auto_deletion_timestamp IS NOT NULL;
