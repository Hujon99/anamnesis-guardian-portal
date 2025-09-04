-- Add personal number field to driving license examinations table
ALTER TABLE public.driving_license_examinations 
ADD COLUMN personal_number TEXT;