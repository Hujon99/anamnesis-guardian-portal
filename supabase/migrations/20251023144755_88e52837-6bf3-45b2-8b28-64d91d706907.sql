-- Add scoring_result column to anamnes_entries table for CISS and other scoring forms
ALTER TABLE public.anamnes_entries 
ADD COLUMN IF NOT EXISTS scoring_result jsonb;

-- Add index on scoring_result for better query performance
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_scoring_result 
ON public.anamnes_entries USING gin (scoring_result);

-- Add comment to document the column
COMMENT ON COLUMN public.anamnes_entries.scoring_result IS 
'Stores scoring results for forms with scoring enabled (e.g., CISS). 
Contains: total_score, max_possible_score, percentage, threshold_exceeded, and flagged_questions array.';