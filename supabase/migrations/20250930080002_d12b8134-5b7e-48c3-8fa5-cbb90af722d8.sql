-- Allow public users to view stores (needed for customer info page before authentication)
-- Stores contain non-sensitive information (name, address, phone) that can be publicly visible
CREATE POLICY "Public users can view stores"
ON public.stores
FOR SELECT
TO anon
USING (true);