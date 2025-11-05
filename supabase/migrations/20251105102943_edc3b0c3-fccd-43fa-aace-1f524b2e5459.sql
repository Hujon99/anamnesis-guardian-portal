-- Add preferred_store_id column to users table for persistent store selection
ALTER TABLE public.users 
ADD COLUMN preferred_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_users_preferred_store ON public.users(preferred_store_id);

-- Comment on column
COMMENT ON COLUMN public.users.preferred_store_id IS 'User''s preferred/last selected store for multi-store organizations';