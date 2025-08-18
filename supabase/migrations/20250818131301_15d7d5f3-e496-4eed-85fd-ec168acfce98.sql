-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'improvement', 'other')),
  screenshot_url TEXT,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback
CREATE POLICY "Organization members can view feedback" 
ON public.feedback 
FOR SELECT 
USING ((auth.jwt() ->> 'org_id'::text) = organization_id);

CREATE POLICY "Organization members can insert feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'org_id'::text) = organization_id AND user_id = (auth.jwt() ->> 'sub'::text));

CREATE POLICY "Users can update their own feedback" 
ON public.feedback 
FOR UPDATE 
USING (user_id = (auth.jwt() ->> 'sub'::text));

-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);

-- Create storage policies for feedback screenshots
CREATE POLICY "Organization members can view feedback screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] IN (
  SELECT organization_id FROM public.feedback WHERE (auth.jwt() ->> 'org_id'::text) = organization_id
));

CREATE POLICY "Authenticated users can upload feedback screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'feedback-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own feedback screenshots" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'feedback-screenshots' AND auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();