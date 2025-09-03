-- Add unique constraint to prevent duplicate entries
ALTER TABLE public.driving_license_examinations 
ADD CONSTRAINT driving_license_examinations_entry_id_unique 
UNIQUE (entry_id);

-- Add better indexing for performance
CREATE INDEX IF NOT EXISTS idx_driving_license_examinations_entry_id 
ON public.driving_license_examinations (entry_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_driving_license_examinations_updated_at
BEFORE UPDATE ON public.driving_license_examinations
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();