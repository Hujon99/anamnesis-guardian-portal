-- Drop kiosk_sessions table
-- This table is no longer needed as we are replacing the kiosk mode with a simpler CISS flow

DROP TABLE IF EXISTS public.kiosk_sessions CASCADE;