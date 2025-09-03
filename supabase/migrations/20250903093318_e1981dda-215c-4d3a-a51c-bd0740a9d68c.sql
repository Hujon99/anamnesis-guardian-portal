-- Clean up duplicate entries, keeping only the most recent one per entry_id
WITH duplicate_records AS (
  SELECT id,
         entry_id,
         ROW_NUMBER() OVER (PARTITION BY entry_id ORDER BY created_at DESC, updated_at DESC) as row_num
  FROM public.driving_license_examinations
  WHERE entry_id IN (
    SELECT entry_id 
    FROM public.driving_license_examinations 
    GROUP BY entry_id 
    HAVING COUNT(*) > 1
  )
)
DELETE FROM public.driving_license_examinations 
WHERE id IN (
  SELECT id 
  FROM duplicate_records 
  WHERE row_num > 1
);

-- Now add the unique constraint
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