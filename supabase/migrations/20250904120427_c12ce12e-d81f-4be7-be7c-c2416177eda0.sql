-- Add columns for optician decision separate from examination completion
ALTER TABLE public.driving_license_examinations 
ADD COLUMN optician_decision TEXT CHECK (optician_decision IN ('approved', 'requires_booking', 'not_approved')),
ADD COLUMN optician_decision_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN optician_notes TEXT,
ADD COLUMN decided_by TEXT;