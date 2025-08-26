-- Create audit_data_access table for tracking data access events
CREATE TABLE IF NOT EXISTS public.audit_data_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action_type TEXT NOT NULL, -- 'view', 'read', 'generate_summary', 'list'
  purpose TEXT, -- additional context like 'detail_view', 'assignment_validation'
  route TEXT, -- the page/route where access occurred
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- User agent and IP info for enhanced audit trail
  user_agent TEXT,
  ip_address_anonymized TEXT
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_audit_data_access_user_org ON public.audit_data_access(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_data_access_table_record ON public.audit_data_access(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_data_access_created_at ON public.audit_data_access(created_at);

-- Enable RLS
ALTER TABLE public.audit_data_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view their audit logs"
ON public.audit_data_access
FOR SELECT
USING (organization_id = (auth.jwt() ->> 'org_id'));

CREATE POLICY "Service role can insert audit logs"
ON public.audit_data_access
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role' OR organization_id = (auth.jwt() ->> 'org_id'));

-- Create the log_access RPC function that auditLogClient.ts expects
CREATE OR REPLACE FUNCTION public.log_access(
  p_table_name TEXT,
  p_record_id TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id TEXT;
  v_org_id TEXT;
BEGIN
  -- Get user info from JWT
  v_user_id := auth.jwt() ->> 'sub';
  v_org_id := auth.jwt() ->> 'org_id';
  
  -- Only log if we have valid user context
  IF v_user_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    INSERT INTO public.audit_data_access (
      user_id,
      organization_id,
      table_name,
      record_id,
      action_type,
      purpose,
      route
    ) VALUES (
      v_user_id,
      v_org_id,
      p_table_name,
      p_record_id,
      COALESCE(p_purpose, 'read'),
      p_purpose,
      p_route
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't fail the main operation
    RAISE NOTICE 'Error in log_access: %', SQLERRM;
END;
$$;

-- Create audit trigger function for anamnes_entries changes
CREATE OR REPLACE FUNCTION public.audit_anamnes_entries_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id TEXT;
  v_action_type TEXT;
  v_changes JSONB;
BEGIN
  -- Get user info from JWT
  v_user_id := auth.jwt() ->> 'sub';
  
  -- Only audit if we have a valid user context
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Determine action type and build changes object
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    -- Build a changes object showing what changed
    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_changes := to_jsonb(OLD);
  END IF;
  
  -- Log the change
  INSERT INTO public.audit_data_access (
    user_id,
    organization_id,
    table_name,
    record_id,
    action_type,
    purpose,
    route
  ) VALUES (
    v_user_id,
    COALESCE(NEW.organization_id, OLD.organization_id),
    'anamnes_entries',
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    v_action_type,
    CASE 
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'status_change'
      WHEN TG_OP = 'UPDATE' AND OLD.ai_summary != NEW.ai_summary THEN 'ai_summary_update'
      WHEN TG_OP = 'UPDATE' AND OLD.optician_id != NEW.optician_id THEN 'optician_assignment'
      WHEN TG_OP = 'UPDATE' AND OLD.store_id != NEW.store_id THEN 'store_assignment'
      ELSE TG_OP::TEXT
    END,
    current_setting('app.current_route', true)
  );
  
  RETURN COALESCE(NEW, OLD);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't fail the main operation
    RAISE NOTICE 'Error in audit_anamnes_entries_changes: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS audit_anamnes_entries_trigger ON public.anamnes_entries;
CREATE TRIGGER audit_anamnes_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.anamnes_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_anamnes_entries_changes();