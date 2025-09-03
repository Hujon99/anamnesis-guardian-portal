-- Add email and name fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update default role to 'optician'
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'optician';

-- Add unique constraint on organization_id and clerk_user_id combination (with check first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_org_clerk_unique'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_org_clerk_unique 
        UNIQUE (organization_id, clerk_user_id);
    END IF;
END $$;

-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "Admins can view users in their org" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users in their org" ON public.users;

-- Create new RLS policies that allow opticians to manage their own records
CREATE POLICY "Users can view users in their organization" 
ON public.users 
FOR SELECT 
USING (organization_id = (auth.jwt() ->> 'org_id'::text));

CREATE POLICY "Users can insert their own user record" 
ON public.users 
FOR INSERT 
WITH CHECK (
  (organization_id = (auth.jwt() ->> 'org_id'::text)) AND 
  (clerk_user_id = (auth.jwt() ->> 'sub'::text))
);

CREATE POLICY "Users can update their own user record" 
ON public.users 
FOR UPDATE 
USING (clerk_user_id = (auth.jwt() ->> 'sub'::text))
WITH CHECK (
  (clerk_user_id = (auth.jwt() ->> 'sub'::text)) AND
  -- Prevent users from changing their organization_id or clerk_user_id
  (organization_id = (auth.jwt() ->> 'org_id'::text))
);

CREATE POLICY "Admins can update user roles in their org" 
ON public.users 
FOR UPDATE 
USING (
  (organization_id = (auth.jwt() ->> 'org_id'::text)) AND 
  ((auth.jwt() ->> 'org_role'::text) = 'org:admin'::text)
);

CREATE POLICY "Admins can insert users in their org" 
ON public.users 
FOR INSERT 
WITH CHECK (
  (organization_id = (auth.jwt() ->> 'org_id'::text)) AND 
  ((auth.jwt() ->> 'org_role'::text) = 'org:admin'::text)
);

-- Create trigger to prevent unauthorized changes to critical fields
CREATE OR REPLACE FUNCTION public.protect_user_critical_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow admins to change roles
  IF OLD.role != NEW.role AND (auth.jwt() ->> 'org_role'::text) != 'org:admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- Never allow organization_id changes after creation
  IF OLD.organization_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Organization ID cannot be changed';
  END IF;
  
  -- Never allow clerk_user_id changes after creation
  IF OLD.clerk_user_id != NEW.clerk_user_id THEN
    RAISE EXCEPTION 'Clerk User ID cannot be changed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to users table
DROP TRIGGER IF EXISTS protect_users_critical_fields ON public.users;
CREATE TRIGGER protect_users_critical_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_critical_fields();