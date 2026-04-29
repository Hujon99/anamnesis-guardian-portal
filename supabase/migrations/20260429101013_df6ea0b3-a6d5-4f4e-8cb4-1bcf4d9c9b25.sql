CREATE OR REPLACE FUNCTION public.set_auto_deletion_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If status changed to 'journaled', set auto_deletion_timestamp to 30 days from now
  IF (NEW.status = 'journaled') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '30 days';
  END IF;

  -- For backward compatibility, also handle 'reviewed' status
  IF (NEW.status = 'reviewed') AND 
     (OLD.status IS NULL OR OLD.status <> NEW.status OR NEW.auto_deletion_timestamp IS NULL) THEN
    NEW.auto_deletion_timestamp := NOW() + INTERVAL '30 days';
  END IF;

  -- If status changed to something else (including 'ready'), clear the auto_deletion_timestamp
  IF (NEW.status IS NOT NULL) AND (NEW.status NOT IN ('journaled', 'reviewed')) THEN
    NEW.auto_deletion_timestamp := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Extend existing journaled entries' deletion timestamp from 48h to 30 days from when they were marked journaled
-- Only push timestamps forward (never shorten), and only for entries not yet expired
UPDATE public.anamnes_entries
SET auto_deletion_timestamp = updated_at + INTERVAL '30 days'
WHERE status IN ('journaled', 'reviewed')
  AND auto_deletion_timestamp IS NOT NULL
  AND auto_deletion_timestamp > NOW()
  AND (updated_at + INTERVAL '30 days') > auto_deletion_timestamp;