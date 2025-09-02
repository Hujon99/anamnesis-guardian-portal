-- Create enum for ID verification types
CREATE TYPE public.id_verification_type AS ENUM (
  'swedish_license',
  'swedish_id', 
  'passport',
  'guardian_certificate'
);

-- Create enum for examination status
CREATE TYPE public.examination_status AS ENUM (
  'pending',
  'in_progress', 
  'completed',
  'requires_booking'
);

-- Create enum for correction type
CREATE TYPE public.correction_type AS ENUM (
  'glasses',
  'contact_lenses',
  'both', 
  'none'
);

-- Create the driving license examinations table
CREATE TABLE public.driving_license_examinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL,
  organization_id TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Visual acuity measurements
  visual_acuity_both_eyes DECIMAL(3,1),
  visual_acuity_right_eye DECIMAL(3,1),
  visual_acuity_left_eye DECIMAL(3,1),
  visual_acuity_with_correction DECIMAL(3,1),
  uses_glasses BOOLEAN DEFAULT false,
  uses_contact_lenses BOOLEAN DEFAULT false,
  correction_type public.correction_type DEFAULT 'none',
  
  -- Warnings and flags
  vision_below_limit BOOLEAN DEFAULT false,
  requires_further_investigation BOOLEAN DEFAULT false,
  warning_flags JSONB DEFAULT '[]'::jsonb,
  
  -- ID verification (mandatory)
  id_verification_completed BOOLEAN DEFAULT false,
  id_type public.id_verification_type,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Status and completion
  examination_status public.examination_status DEFAULT 'pending',
  passed_examination BOOLEAN,
  requires_optician_visit BOOLEAN DEFAULT false,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.driving_license_examinations ENABLE ROW LEVEL SECURITY;

-- Create policies for organization access
CREATE POLICY "Organization members can view driving license examinations"
ON public.driving_license_examinations
FOR SELECT
USING ((auth.jwt() ->> 'org_id') = organization_id);

CREATE POLICY "Organization members can insert driving license examinations"
ON public.driving_license_examinations  
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'org_id') = organization_id);

CREATE POLICY "Organization members can update driving license examinations"
ON public.driving_license_examinations
FOR UPDATE
USING ((auth.jwt() ->> 'org_id') = organization_id);

CREATE POLICY "Organization members can delete driving license examinations"
ON public.driving_license_examinations
FOR DELETE
USING ((auth.jwt() ->> 'org_id') = organization_id);

-- Add foreign key relationship
ALTER TABLE public.driving_license_examinations 
ADD CONSTRAINT fk_driving_license_examinations_entry_id 
FOREIGN KEY (entry_id) REFERENCES public.anamnes_entries(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_driving_license_examinations_entry_id 
ON public.driving_license_examinations(entry_id);

CREATE INDEX idx_driving_license_examinations_org_id 
ON public.driving_license_examinations(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_driving_license_examinations_updated_at
BEFORE UPDATE ON public.driving_license_examinations
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();